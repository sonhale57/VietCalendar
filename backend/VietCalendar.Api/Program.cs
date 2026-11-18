using Microsoft.Data.SqlClient;
using Google.Apis.Auth;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.RateLimiting;
using VietCalendar.Api.Accounts;
using VietCalendar.Api.Calendar;
using VietCalendar.Api.Content;
using VietCalendar.Api.Database;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<VietnameseLunarCalendar>();
builder.Services.AddSingleton<CalendarContentRepository>();
builder.Services.AddSingleton<LunarCalendarAdviceRepository>();
builder.Services.AddSingleton<ILunarCalendarAdviceService, LunarCalendarAdviceService>();
builder.Services.AddSingleton<SqlServerDatabaseInitializer>();
builder.Services.AddSingleton<UserAccountRepository>();
builder.Services.AddSingleton<GoogleTokenValidator>();
builder.Services.AddSingleton<EmailOtpSender>();
builder.Services.AddSingleton<LocalAccountService>();
builder.Services.AddSingleton<AccountAuthenticator>();
builder.Services.AddSingleton<CalendarEventRepository>();
builder.Services.AddSingleton<ICalendarEventService, CalendarEventService>();
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", limiter =>
    {
        limiter.PermitLimit = 12;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
    });
});
builder.Services.AddHttpClient<GoogleCalendarService>();
var dataProtectionKeysPath = builder.Configuration["GoogleAuth:DataProtectionKeysPath"];
var dataProtection = builder.Services.AddDataProtection().SetApplicationName("VietCalendar.Api");
if (!string.IsNullOrWhiteSpace(dataProtectionKeysPath))
{
    dataProtection.PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath));
}
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
if (allowedOrigins.Length > 0)
{
    builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));
}
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();
await app.Services
    .GetRequiredService<SqlServerDatabaseInitializer>()
    .InitializeAsync(CancellationToken.None);
app.UseCors();
app.UseRateLimiter();
app.MapAuthEndpoints();
app.MapCalendarEventEndpoints();
app.MapLunarCalendarAdviceEndpoints();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapGet("/api/v1/calendar/day", (DateOnly date, VietnameseLunarCalendar calendar) =>
{
    if (date.Year is < 1900 or > 2100)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["date"] = ["Supported years are 1900 through 2100."]
        });
    }

    return Results.Ok(calendar.GetDay(date));
})
    .WithName("GetCalendarDay")
    .WithOpenApi();

app.MapGet("/api/v1/calendar/month", (int year, int month, VietnameseLunarCalendar calendar) =>
{
    if (year is < 1900 or > 2100 || month is < 1 or > 12)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["date"] = ["Supported range is 1900-2100 and month must be 1-12."]
        });
    }

    return Results.Ok(calendar.GetMonth(year, month));
})
    .WithName("GetCalendarMonth")
    .WithOpenApi();

app.MapGet("/api/v1/content/holidays", async (
    int month,
    CalendarContentRepository content,
    IConfiguration configuration,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    if (month is < 1 or > 12)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["month"] = ["Month must be between 1 and 12."]
        });
    }

    var connectionString = configuration.GetConnectionString("CalendarDb");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem(
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Calendar database is not configured.",
            detail: "Set ConnectionStrings:CalendarDb before requesting holiday content.");
    }

    try
    {
        return Results.Ok(await content.GetHolidaysAsync(connectionString, month, cancellationToken));
    }
    catch (SqlException exception)
    {
        logger.LogError(exception, "Could not read calendar content for month {Month}.", month);
        return Results.Problem(
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Calendar content is temporarily unavailable.",
            detail: "The configured SQL Server could not be reached or queried.");
    }
})
    .WithName("GetCalendarHolidays")
    .WithOpenApi();

app.MapPost("/api/v1/auth/google", async (
    HttpContext context,
    GoogleTokenValidator tokenValidator,
    LocalAccountService localAccounts,
    UserAccountRepository accounts,
    IConfiguration configuration,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var token = GetBearerToken(context);
    if (token is null)
    {
        return Results.Unauthorized();
    }

    GoogleAccount user;
    try
    {
        user = await tokenValidator.ValidateAsync(token, cancellationToken);
    }
    catch (InvalidJwtException)
    {
        return Results.Unauthorized();
    }
    catch (InvalidOperationException exception)
    {
        logger.LogError(exception, "Google OAuth audiences are not configured.");
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Google sign-in is not configured.");
    }
    catch (HttpRequestException exception)
    {
        logger.LogError(exception, "Google token validation is unavailable.");
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Google sign-in is temporarily unavailable.");
    }

    var connectionString = configuration.GetConnectionString("CalendarDb");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Account database is not configured.");
    }

    try
    {
        var existingAccount = await accounts.GoogleAccountExistsAsync(connectionString, user.Subject, cancellationToken);
        if (!existingAccount &&
            await accounts.EmailBelongsToAnotherAccountAsync(connectionString, user.Email, user.Subject, cancellationToken))
        {
            return Results.Conflict(new { detail = "Email này đã được đăng ký bằng phương thức khác." });
        }
        await accounts.UpsertGoogleAccountAsync(connectionString, user, cancellationToken);
        var settings = await accounts.GetSettingsAsync(connectionString, user.Subject, cancellationToken);
        var sessionToken = await localAccounts.CreateSessionForUserAsync(user.Subject, cancellationToken);
        return Results.Ok(new AuthSessionResponse(
            sessionToken,
            user,
            settings,
            LocalAccountService.IsAdmin(configuration, user.Email),
            await localAccounts.HasPasswordAsync(user.Subject, cancellationToken)));
    }
    catch (SqlException exception)
    {
        logger.LogError(exception, "Could not persist Google account {Subject}.", user.Subject);
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Account storage is temporarily unavailable.");
    }
    catch (InvalidOperationException exception)
    {
        logger.LogInformation(exception, "Google account email is already registered.");
        return Results.Conflict(new { detail = "Email này đã được đăng ký bằng phương thức khác." });
    }
})
    .WithName("SignInWithGoogle")
    .WithOpenApi()
    .RequireRateLimiting("auth");

app.MapPut("/api/v1/account/settings", async (
    HttpContext context,
    CalendarUserSettings settings,
    AccountAuthenticator authenticator,
    UserAccountRepository accounts,
    IConfiguration configuration,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var validationError = ValidateSettings(settings);
    if (validationError is not null)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["settings"] = [validationError] });
    }

    var token = GetBearerToken(context);
    if (token is null)
    {
        return Results.Unauthorized();
    }

    GoogleAccount user;
    try
    {
        user = await authenticator.AuthenticateAsync(token, cancellationToken);
    }
    catch (InvalidJwtException)
    {
        return Results.Unauthorized();
    }
    catch (InvalidOperationException exception)
    {
        logger.LogError(exception, "Authentication configuration is invalid.");
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Authentication is not configured.");
    }
    catch (HttpRequestException exception)
    {
        logger.LogError(exception, "Google token validation is unavailable.");
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Google sign-in is temporarily unavailable.");
    }

    var connectionString = configuration.GetConnectionString("CalendarDb");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Account database is not configured.");
    }

    try
    {
        await accounts.SaveSettingsAsync(connectionString, user.Subject, settings, cancellationToken);
        return Results.NoContent();
    }
    catch (InvalidOperationException)
    {
        return Results.Unauthorized();
    }
    catch (SqlException exception)
    {
        logger.LogError(exception, "Could not save settings for Google account {Subject}.", user.Subject);
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Account storage is temporarily unavailable.");
    }
})
    .WithName("SaveAccountSettings")
    .WithOpenApi();

app.MapGet("/api/v1/google-calendar/status", async (
    HttpContext context,
    AccountAuthenticator authenticator,
    UserAccountRepository accounts,
    IConfiguration configuration,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var token = GetBearerToken(context);
    if (token is null) return Results.Unauthorized();

    GoogleAccount user;
    try
    {
        user = await authenticator.AuthenticateAsync(token, cancellationToken);
    }
    catch (InvalidJwtException)
    {
        return Results.Unauthorized();
    }

    var connectionString = configuration.GetConnectionString("CalendarDb");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Account database is not configured.");
    }

    try
    {
        var calendarToken = await accounts.GetCalendarTokenAsync(connectionString, user.Subject, cancellationToken);
        return Results.Ok(new GoogleCalendarConnectionStatus(calendarToken is not null));
    }
    catch (SqlException exception)
    {
        logger.LogError(exception, "Could not read Google Calendar status for account {Subject}.", user.Subject);
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Calendar account storage is temporarily unavailable.");
    }
})
    .WithName("GetGoogleCalendarStatus")
    .WithOpenApi();

app.MapPost("/api/v1/google-calendar/link", async (
    HttpContext context,
    GoogleCalendarLinkRequest request,
    AccountAuthenticator authenticator,
    GoogleTokenValidator tokenValidator,
    GoogleCalendarService googleCalendar,
    UserAccountRepository accounts,
    IConfiguration configuration,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var validationError = ValidateCalendarLinkRequest(request);
    if (validationError is not null)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["authorization"] = [validationError] });
    }

    var token = GetBearerToken(context);
    if (token is null) return Results.Unauthorized();

    GoogleAccount user;
    try
    {
        user = await authenticator.AuthenticateAsync(token, cancellationToken);
    }
    catch (InvalidJwtException)
    {
        return Results.Unauthorized();
    }

    var connectionString = configuration.GetConnectionString("CalendarDb");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Account database is not configured.");
    }

    try
    {
        var tokens = await googleCalendar.ExchangeAuthorizationCodeAsync(request, cancellationToken);
        var calendarUser = await tokenValidator.ValidateAsync(tokens.IdToken, cancellationToken);
        if (!string.Equals(user.Subject, calendarUser.Subject, StringComparison.Ordinal))
        {
            return Results.Unauthorized();
        }

        var existingToken = tokens.RefreshToken is null
            ? await accounts.GetCalendarTokenAsync(connectionString, user.Subject, cancellationToken)
            : null;
        var refreshToken = tokens.RefreshToken ??
            (existingToken is null ? null : googleCalendar.UnprotectRefreshToken(existingToken.ProtectedRefreshToken));
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return Results.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Google did not provide offline Calendar access.",
                detail: "Retry the connection and approve the Calendar permission.");
        }

        await accounts.SaveProtectedCalendarRefreshTokenAsync(
            connectionString,
            user.Subject,
            googleCalendar.ProtectRefreshToken(refreshToken),
            request.ClientId,
            cancellationToken);
        return Results.NoContent();
    }
    catch (GoogleCalendarConfigurationException exception)
    {
        logger.LogError(exception, "Google Calendar OAuth is not configured.");
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Google Calendar is not configured on the server.");
    }
    catch (GoogleCalendarUnauthorizedException)
    {
        return Results.Unauthorized();
    }
    catch (InvalidJwtException)
    {
        return Results.Unauthorized();
    }
    catch (HttpRequestException exception)
    {
        logger.LogError(exception, "Google Calendar authorization failed for account {Subject}.", user.Subject);
        return Results.Problem(statusCode: StatusCodes.Status502BadGateway, title: "Could not authorize Google Calendar.");
    }
    catch (SqlException exception)
    {
        logger.LogError(exception, "Could not save Google Calendar authorization for account {Subject}.", user.Subject);
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Calendar account storage is temporarily unavailable.");
    }
    catch (InvalidOperationException)
    {
        return Results.Unauthorized();
    }
})
    .WithName("LinkGoogleCalendar")
    .WithOpenApi();

app.MapPost("/api/v1/google-calendar/sync", async (
    HttpContext context,
    GoogleCalendarSyncRequest request,
    AccountAuthenticator authenticator,
    GoogleCalendarService googleCalendar,
    UserAccountRepository accounts,
    IConfiguration configuration,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var validationError = ValidateCalendarSyncRequest(request);
    if (validationError is not null)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]> { ["events"] = [validationError] });
    }

    var token = GetBearerToken(context);
    if (token is null) return Results.Unauthorized();

    GoogleAccount user;
    try
    {
        user = await authenticator.AuthenticateAsync(token, cancellationToken);
    }
    catch (InvalidJwtException)
    {
        return Results.Unauthorized();
    }

    var connectionString = configuration.GetConnectionString("CalendarDb");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Account database is not configured.");
    }

    try
    {
        var calendarToken = await accounts.GetCalendarTokenAsync(connectionString, user.Subject, cancellationToken);
        if (calendarToken is null)
        {
            return Results.Conflict(new { title = "Google Calendar is not connected." });
        }

        var events = await googleCalendar.SyncAsync(
            calendarToken.ProtectedRefreshToken, calendarToken.ClientId, request, cancellationToken);
        return Results.Ok(new GoogleCalendarSyncResponse(events));
    }
    catch (GoogleCalendarConfigurationException exception)
    {
        logger.LogError(exception, "Google Calendar sync is not configured.");
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Google Calendar is not configured on the server.");
    }
    catch (GoogleCalendarUnauthorizedException)
    {
        return Results.Unauthorized();
    }
    catch (HttpRequestException exception)
    {
        logger.LogError(exception, "Google Calendar sync failed for account {Subject}.", user.Subject);
        return Results.Problem(statusCode: StatusCodes.Status502BadGateway, title: "Google Calendar sync failed.");
    }
    catch (SqlException exception)
    {
        logger.LogError(exception, "Could not read Google Calendar authorization for account {Subject}.", user.Subject);
        return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Calendar account storage is temporarily unavailable.");
    }
})
    .WithName("SyncGoogleCalendar")
    .WithOpenApi();

app.Run();

static string? GetBearerToken(HttpContext context)
{
    var authorization = context.Request.Headers.Authorization.ToString();
    return authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
        ? authorization["Bearer ".Length..].Trim()
        : null;
}

static string? ValidateSettings(CalendarUserSettings settings)
{
    if (string.IsNullOrWhiteSpace(settings.ProfileName) || settings.ProfileName.Length > 100)
        return "Tên hồ sơ phải có từ 1 đến 100 ký tự.";
    if (settings.RelativeNames is null ||
        settings.RelativeNames.Length > 3 ||
        settings.RelativeNames.Any(name => name is null || name.Length > 100))
        return "Tối đa 3 tên người thân, mỗi tên không quá 100 ký tự.";
    if (settings.RelativeBirthDates is { Length: > 3 } ||
        settings.RelativeBirthDates?.Any(date => date is null || date.Length > 10) == true)
        return "Ngày sinh người thân không hợp lệ.";
    if (settings.RelativeBirthCalendarTypes is { Length: > 3 } ||
        settings.RelativeBirthCalendarTypes?.Any(type => type is not ("Dương lịch" or "Âm lịch")) == true)
        return "Loại ngày sinh người thân không hợp lệ.";
    if (settings.RelativeGenders is { Length: > 3 } ||
        settings.RelativeGenders?.Any(value => value is not ("Nam" or "Nữ" or "Chưa chọn")) == true)
        return "Giới tính người thân không hợp lệ.";
    if (settings.BirthDate is null || settings.BirthDate.Length > 10)
        return "Ngày sinh không hợp lệ.";
    if (settings.BirthCalendarType is not ("Dương lịch" or "Âm lịch"))
        return "Loại ngày sinh không hợp lệ.";
    if (settings.BirthHour is null || settings.BirthHour.Length > 5)
        return "Giờ sinh không hợp lệ.";
    if (settings.Gender is not ("Nam" or "Nữ" or "Chưa chọn"))
        return "Giới tính không hợp lệ.";
    if (settings.ThemeIndex is < 0 or > 3)
        return "Theme không hợp lệ.";
    if (settings.NavigationStyle is not ("mono" or "image"))
        return "Kiểu thanh điều hướng không hợp lệ.";
    if (settings.NavigationImage is null || settings.NavigationImage.Length > 2048)
        return "URL ảnh nền không được vượt quá 2048 ký tự.";
    if (settings.FastingMode is not ("Nhị trai" or "Tứ trai" or "Lục trai" or "Thập trai" or "Chay trường"))
        return "Chu kỳ Thanh Trai không hợp lệ.";
    return null;
}

static string? ValidateCalendarLinkRequest(GoogleCalendarLinkRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Code) || request.Code.Length > 4096)
        return "Mã xác thực Google không hợp lệ.";
    if (string.IsNullOrWhiteSpace(request.CodeVerifier) || request.CodeVerifier.Length is < 43 or > 128)
        return "Mã PKCE không hợp lệ.";
    if (string.IsNullOrWhiteSpace(request.RedirectUri) || request.RedirectUri.Length > 2048)
        return "Địa chỉ chuyển hướng không hợp lệ.";
    if (string.IsNullOrWhiteSpace(request.ClientId) || request.ClientId.Length > 512)
        return "OAuth Client ID không hợp lệ.";
    return null;
}

static string? ValidateCalendarSyncRequest(GoogleCalendarSyncRequest request)
{
    if (request.Events is null ||
        request.DeletedEvents is null ||
        request.Events.Length + request.DeletedEvents.Length > 200)
        return "Số lượng sự kiện đồng bộ không được vượt quá 200.";
    if (request.EndDate <= request.StartDate || request.EndDate.DayNumber - request.StartDate.DayNumber > 90)
        return "Khoảng đồng bộ phải từ 1 đến 90 ngày.";

    var ids = new HashSet<string>(StringComparer.Ordinal);
    foreach (var calendarEvent in request.Events)
    {
        if (string.IsNullOrWhiteSpace(calendarEvent.Id) ||
            calendarEvent.Id.Length > 128 ||
            !ids.Add(calendarEvent.Id) ||
            calendarEvent.GoogleEventId?.Length > 256)
            return "Mã sự kiện trống, quá dài hoặc bị trùng.";
        if (string.IsNullOrWhiteSpace(calendarEvent.Summary) || calendarEvent.Summary.Length > 200)
            return "Tiêu đề sự kiện phải có từ 1 đến 200 ký tự.";
        if (calendarEvent.Description?.Length > 1000)
            return "Mô tả sự kiện không được vượt quá 1000 ký tự.";
        if (calendarEvent.StartDate < request.StartDate ||
            calendarEvent.StartDate >= request.EndDate ||
            calendarEvent.EndDate is { } endDate &&
            (endDate <= calendarEvent.StartDate || endDate > request.EndDate))
            return "Ngày sự kiện nằm ngoài khoảng đồng bộ.";
    }
    var deletedIds = new HashSet<string>(StringComparer.Ordinal);
    foreach (var deletedEvent in request.DeletedEvents)
    {
        if (string.IsNullOrWhiteSpace(deletedEvent.Id) ||
            deletedEvent.Id.Length > 128 ||
            !deletedEvent.Id.StartsWith("personal-", StringComparison.Ordinal) ||
            !deletedIds.Add(deletedEvent.Id) ||
            deletedEvent.GoogleEventId?.Length > 256)
            return "Mã sự kiện đã xóa không hợp lệ.";
    }
    if (ids.Overlaps(deletedIds))
        return "Không thể vừa thêm vừa xóa cùng một sự kiện trong một lần đồng bộ.";
    return null;
}
