using System.Net.Mail;
using Google.Apis.Auth;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.SqlClient;

namespace VietCalendar.Api.Accounts;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var auth = app.MapGroup("/api/v1/auth").RequireRateLimiting("auth");

        auth.MapPost("/email/register/request-otp", async (
            EmailRequest request,
            LocalAccountService accounts,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            try
            {
                await accounts.RequestRegistrationCodeAsync(request.Email, cancellationToken);
                return Results.Ok(new { message = "Nếu email đủ điều kiện, mã xác minh sẽ được gửi trong ít phút." });
            }
            catch (AuthValidationException exception) { return Results.BadRequest(new { detail = exception.Message }); }
            catch (AuthConflictException exception) { return Results.Conflict(new { detail = exception.Message }); }
            catch (AuthConfigurationException exception) { return Results.Problem(statusCode: 503, title: exception.Message); }
            catch (SqlException exception)
            {
                logger.LogError(exception, "Could not request an email registration code.");
                return Results.Problem(statusCode: 503, title: "Dịch vụ tài khoản hiện không khả dụng.");
            }
            catch (SmtpException exception)
            {
                logger.LogError(exception, "Could not send an email registration code.");
                return Results.Problem(statusCode: 503, title: "Không gửi được email xác minh. Hãy thử lại sau.");
            }
        });

        auth.MapPost("/email/register", async (
            EmailRegistrationRequest request,
            LocalAccountService localAccounts,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            try
            {
                return Results.Ok(await localAccounts.RegisterAsync(request, cancellationToken));
            }
            catch (AuthValidationException exception) { return Results.BadRequest(new { detail = exception.Message }); }
            catch (AuthConflictException exception) { return Results.Conflict(new { detail = exception.Message }); }
            catch (AuthConfigurationException exception) { return Results.Problem(statusCode: 503, title: exception.Message); }
            catch (SqlException exception)
            {
                logger.LogError(exception, "Could not create an email account.");
                return Results.Problem(statusCode: 503, title: "Dịch vụ tài khoản hiện không khả dụng.");
            }
        });

        auth.MapPost("/email/login", async (
            EmailLoginRequest request,
            LocalAccountService localAccounts,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            try
            {
                return Results.Ok(await localAccounts.SignInAsync(request, cancellationToken));
            }
            catch (AuthValidationException exception)
            {
                return Results.Problem(statusCode: 401, title: exception.Message);
            }
            catch (AuthConfigurationException exception) { return Results.Problem(statusCode: 503, title: exception.Message); }
            catch (SqlException exception)
            {
                logger.LogError(exception, "Could not sign in an email account.");
                return Results.Problem(statusCode: 503, title: "Dịch vụ tài khoản hiện không khả dụng.");
            }
        });

        auth.MapPost("/email/verification/request-otp", async (
            HttpContext context,
            AccountAuthenticator authenticator,
            LocalAccountService localAccounts,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var token = GetBearerToken(context);
            if (token is null) return Results.Unauthorized();
            try
            {
                var user = await authenticator.AuthenticateAsync(token, cancellationToken);
                await localAccounts.RequestEmailVerificationCodeAsync(user.Subject, cancellationToken);
                return Results.Ok(new { message = "Mã xác minh sẽ được gửi nếu tài khoản cần xác minh." });
            }
            catch (InvalidJwtException) { return Results.Unauthorized(); }
            catch (AuthValidationException exception) { return Results.BadRequest(new { detail = exception.Message }); }
            catch (AuthConfigurationException exception) { return Results.Problem(statusCode: 503, title: exception.Message); }
            catch (SqlException exception)
            {
                logger.LogError(exception, "Could not request an email verification code.");
                return Results.Problem(statusCode: 503, title: "Dịch vụ tài khoản hiện không khả dụng.");
            }
            catch (SmtpException exception)
            {
                logger.LogError(exception, "Could not send an email verification code.");
                return Results.Problem(statusCode: 503, title: "Không gửi được email xác minh. Hãy thử lại sau.");
            }
        });

        auth.MapPost("/email/verification", async (
            HttpContext context,
            EmailVerificationRequest request,
            AccountAuthenticator authenticator,
            LocalAccountService localAccounts,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var token = GetBearerToken(context);
            if (token is null) return Results.Unauthorized();
            try
            {
                var user = await authenticator.AuthenticateAsync(token, cancellationToken);
                await localAccounts.VerifyEmailAsync(user.Subject, request.Code, cancellationToken);
                return Results.NoContent();
            }
            catch (InvalidJwtException) { return Results.Unauthorized(); }
            catch (AuthValidationException exception) { return Results.BadRequest(new { detail = exception.Message }); }
            catch (AuthConfigurationException exception) { return Results.Problem(statusCode: 503, title: exception.Message); }
            catch (SqlException exception)
            {
                logger.LogError(exception, "Could not verify an email account.");
                return Results.Problem(statusCode: 503, title: "Dịch vụ tài khoản hiện không khả dụng.");
            }
        });

        auth.MapPost("/email/forgot-password/request-otp", async (
            EmailRequest request,
            LocalAccountService localAccounts,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            try
            {
                await localAccounts.RequestPasswordResetCodeAsync(request.Email, cancellationToken);
                return Results.Ok(new { message = "Nếu email có tài khoản mật khẩu, mã xác minh sẽ được gửi." });
            }
            catch (AuthValidationException) { return Results.Ok(new { message = "Nếu email có tài khoản mật khẩu, mã xác minh sẽ được gửi." }); }
            catch (AuthConfigurationException exception) { return Results.Problem(statusCode: 503, title: exception.Message); }
            catch (SqlException exception)
            {
                logger.LogError(exception, "Could not request a password reset code.");
                return Results.Problem(statusCode: 503, title: "Dịch vụ tài khoản hiện không khả dụng.");
            }
            catch (SmtpException exception)
            {
                logger.LogError(exception, "Could not send a password reset code.");
                return Results.Problem(statusCode: 503, title: "Không gửi được email xác minh. Hãy thử lại sau.");
            }
        });

        auth.MapPost("/email/forgot-password", async (
            PasswordResetRequest request,
            LocalAccountService localAccounts,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            try
            {
                await localAccounts.ResetPasswordAsync(request, cancellationToken);
                return Results.NoContent();
            }
            catch (AuthValidationException exception) { return Results.BadRequest(new { detail = exception.Message }); }
            catch (AuthConfigurationException exception) { return Results.Problem(statusCode: 503, title: exception.Message); }
            catch (SqlException exception)
            {
                logger.LogError(exception, "Could not reset an email account password.");
                return Results.Problem(statusCode: 503, title: "Dịch vụ tài khoản hiện không khả dụng.");
            }
        });

        auth.MapGet("/me", async (
            HttpContext context,
            AccountAuthenticator authenticator,
            LocalAccountService localAccounts,
            UserAccountRepository repository,
            IConfiguration configuration,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var token = GetBearerToken(context);
            if (token is null) return Results.Unauthorized();
            try
            {
                var user = await authenticator.AuthenticateAsync(token, cancellationToken);
                var connectionString = configuration.GetConnectionString("CalendarDb");
                if (string.IsNullOrWhiteSpace(connectionString))
                    return Results.Problem(statusCode: 503, title: "Account database is not configured.");
                return Results.Ok(new AuthSessionResponse(
                    token,
                    user,
                    await repository.GetSettingsAsync(connectionString, user.Subject, cancellationToken),
                    LocalAccountService.IsAdmin(configuration, user.Email),
                    await localAccounts.HasPasswordAsync(user.Subject, cancellationToken),
                    await localAccounts.IsEmailVerifiedAsync(user.Subject, cancellationToken)));
            }
            catch (InvalidJwtException) { return Results.Unauthorized(); }
            catch (SqlException exception)
            {
                logger.LogError(exception, "Could not restore the authenticated account.");
                return Results.Problem(statusCode: 503, title: "Dịch vụ tài khoản hiện không khả dụng.");
            }
        });

        auth.MapPost("/email/change-password", async (
            HttpContext context,
            PasswordChangeRequest request,
            AccountAuthenticator authenticator,
            LocalAccountService localAccounts,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var token = GetBearerToken(context);
            if (token is null) return Results.Unauthorized();
            try
            {
                var user = await authenticator.AuthenticateAsync(token, cancellationToken);
                await localAccounts.ChangePasswordAsync(user.Subject, token, request, cancellationToken);
                return Results.NoContent();
            }
            catch (InvalidJwtException) { return Results.Unauthorized(); }
            catch (AuthValidationException exception) { return Results.BadRequest(new { detail = exception.Message }); }
            catch (SqlException exception)
            {
                logger.LogError(exception, "Could not change the account password.");
                return Results.Problem(statusCode: 503, title: "Dịch vụ tài khoản hiện không khả dụng.");
            }
        });

        auth.MapPost("/logout", async (
            HttpContext context,
            LocalAccountService localAccounts,
            CancellationToken cancellationToken) =>
        {
            var token = GetBearerToken(context);
            if (token is null) return Results.Unauthorized();
            if (token.StartsWith("lv_", StringComparison.Ordinal))
            {
                await localAccounts.RevokeSessionAsync(token, cancellationToken);
            }
            return Results.NoContent();
        });

        var admin = auth.MapGroup("/admin/email-allowlist");
        admin.MapGet("/", async (
            HttpContext context,
            AccountAuthenticator authenticator,
            LocalAccountService localAccounts,
            CancellationToken cancellationToken) =>
        {
            var user = await GetAdminAsync(context, authenticator, cancellationToken);
            return user is null
                ? Results.StatusCode(StatusCodes.Status403Forbidden)
                : Results.Ok(await localAccounts.GetAllowlistAsync(cancellationToken));
        });
        admin.MapPost("/", async (
            HttpContext context,
            EmailAllowlistRuleRequest request,
            AccountAuthenticator authenticator,
            LocalAccountService localAccounts,
            CancellationToken cancellationToken) =>
        {
            var user = await GetAdminAsync(context, authenticator, cancellationToken);
            if (user is null) return Results.StatusCode(StatusCodes.Status403Forbidden);
            try
            {
                var id = await localAccounts.AddAllowlistRuleAsync(request, cancellationToken);
                return Results.Ok(new { id });
            }
            catch (AuthValidationException exception) { return Results.BadRequest(new { detail = exception.Message }); }
        });
        admin.MapDelete("/{id:int}", async (
            int id,
            HttpContext context,
            AccountAuthenticator authenticator,
            LocalAccountService localAccounts,
            CancellationToken cancellationToken) =>
        {
            var user = await GetAdminAsync(context, authenticator, cancellationToken);
            if (user is null) return Results.StatusCode(StatusCodes.Status403Forbidden);
            try
            {
                await localAccounts.RemoveAllowlistRuleAsync(id, cancellationToken);
                return Results.NoContent();
            }
            catch (AuthValidationException exception) { return Results.NotFound(new { detail = exception.Message }); }
        });
    }

    private static async Task<GoogleAccount?> GetAdminAsync(
        HttpContext context,
        AccountAuthenticator authenticator,
        CancellationToken cancellationToken)
    {
        var token = GetBearerToken(context);
        if (token is null) return null;
        try
        {
            var user = await authenticator.AuthenticateAsync(token, cancellationToken);
            return authenticator.IsAdmin(user.Email) ? user : null;
        }
        catch (InvalidJwtException)
        {
            return null;
        }
    }

    private static string? GetBearerToken(HttpContext context)
    {
        var authorization = context.Request.Headers.Authorization.ToString();
        return authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? authorization["Bearer ".Length..].Trim()
            : null;
    }
}
