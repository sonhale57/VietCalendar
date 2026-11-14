using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.DataProtection;

namespace VietCalendar.Api.Accounts;

public sealed class GoogleCalendarService(
    HttpClient httpClient,
    IConfiguration configuration,
    IDataProtectionProvider dataProtectionProvider)
{
    private const string CalendarScope = "https://www.googleapis.com/auth/calendar.events";
    private const string EventsEndpoint = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IDataProtector _tokenProtector =
        dataProtectionProvider.CreateProtector("VietCalendar.GoogleCalendarRefreshToken.v1");

    public async Task<CalendarAuthorizationTokens> ExchangeAuthorizationCodeAsync(
        GoogleCalendarLinkRequest request,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();
        ValidateClientAndRedirect(request.ClientId, request.RedirectUri);

        using var form = new FormUrlEncodedContent(CreateTokenForm(
            ("code", request.Code),
            ("code_verifier", request.CodeVerifier),
            ("redirect_uri", request.RedirectUri),
            ("client_id", request.ClientId),
            ("grant_type", "authorization_code")));
        using var response = await httpClient.PostAsync(
            "https://oauth2.googleapis.com/token", form, cancellationToken);
        var tokens = await ReadTokenResponseAsync(response, cancellationToken);
        if (string.IsNullOrWhiteSpace(tokens.IdToken) ||
            tokens.Scope is not null &&
            !tokens.Scope.Split(' ', StringSplitOptions.RemoveEmptyEntries).Contains(CalendarScope))
        {
            throw new GoogleCalendarUnauthorizedException(
                "Google did not grant the requested Calendar permission. Reconnect and approve calendar access.");
        }

        return new CalendarAuthorizationTokens(tokens.IdToken, tokens.RefreshToken);
    }

    public string ProtectRefreshToken(string refreshToken)
    {
        EnsureConfigured();
        return _tokenProtector.Protect(refreshToken);
    }

    public string UnprotectRefreshToken(string protectedRefreshToken)
    {
        EnsureConfigured();
        return _tokenProtector.Unprotect(protectedRefreshToken);
    }

    public async Task<GoogleCalendarEvent[]> SyncAsync(
        string protectedRefreshToken,
        string clientId,
        GoogleCalendarSyncRequest request,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();
        ValidateClient(clientId);
        var accessToken = await RefreshAccessTokenAsync(protectedRefreshToken, clientId, cancellationToken);
        var existingEvents = await GetEventsAsync(accessToken, request.StartDate, request.EndDate, cancellationToken);
        var desiredById = request.Events.ToDictionary(calendarEvent => calendarEvent.Id, StringComparer.Ordinal);
        var managedEvents = existingEvents
            .Where(calendarEvent => calendarEvent.ExtendedProperties?.Private?.ContainsKey("lichvietAppEventId") == true)
            .ToArray();

        foreach (var existing in managedEvents)
        {
            var appEventId = existing.ExtendedProperties!.Private!["lichvietAppEventId"];
            var obsoleteFastingDay = appEventId.StartsWith("fasting-", StringComparison.Ordinal) &&
                !desiredById.ContainsKey(appEventId);
            if (existing.Id is not null && obsoleteFastingDay)
            {
                await DeleteEventAsync(accessToken, existing.Id, cancellationToken);
            }
        }

        foreach (var deletedEvent in request.DeletedEvents)
        {
            if (!string.IsNullOrWhiteSpace(deletedEvent.GoogleEventId))
            {
                await DeleteOwnedEventAsync(accessToken, deletedEvent, cancellationToken);
            }
        }

        var managedByAppId = managedEvents
            .Where(calendarEvent => calendarEvent.Id is not null)
            .GroupBy(
                calendarEvent => calendarEvent.ExtendedProperties!.Private!["lichvietAppEventId"],
                StringComparer.Ordinal)
            .ToDictionary(
                group => group.Key,
                group => group.First(),
                StringComparer.Ordinal);

        foreach (var appEvent in request.Events)
        {
            if (managedByAppId.ContainsKey(appEvent.Id) || appEvent.GoogleEventId is not null)
            {
                continue;
            }

            await CreateEventAsync(accessToken, ToGoogleResource(appEvent), cancellationToken);
        }

        var syncedEvents = await GetEventsAsync(accessToken, request.StartDate, request.EndDate, cancellationToken);
        return syncedEvents
            .Where(calendarEvent => calendarEvent.Status != "cancelled")
            .Select(ToResponse)
            .ToArray();
    }

    private async Task<string> RefreshAccessTokenAsync(
        string protectedRefreshToken,
        string clientId,
        CancellationToken cancellationToken)
    {
        string refreshToken;
        try
        {
            refreshToken = _tokenProtector.Unprotect(protectedRefreshToken);
        }
        catch (System.Security.Cryptography.CryptographicException exception)
        {
            throw new GoogleCalendarConfigurationException(
                $"The saved Google Calendar token cannot be decrypted with the configured data-protection key ring: {exception.Message}");
        }

        var formValues = new List<(string Key, string Value)>
        {
            ("refresh_token", refreshToken),
            ("client_id", clientId),
            ("grant_type", "refresh_token"),
        };
        if (string.Equals(clientId, configuration["GoogleAuth:WebClientId"], StringComparison.Ordinal))
        {
            formValues.Add(("client_secret", configuration["GoogleAuth:ClientSecret"]!));
        }

        using var form = new FormUrlEncodedContent(CreateTokenForm(formValues.ToArray()));
        using var response = await httpClient.PostAsync(
            "https://oauth2.googleapis.com/token", form, cancellationToken);
        var tokens = await ReadTokenResponseAsync(response, cancellationToken);
        if (string.IsNullOrWhiteSpace(tokens.AccessToken))
        {
            throw new GoogleCalendarUnauthorizedException("Google did not return a Calendar access token.");
        }

        return tokens.AccessToken;
    }

    private async Task<List<GoogleEventResource>> GetEventsAsync(
        string accessToken,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken cancellationToken)
    {
        var events = new List<GoogleEventResource>();
        string? pageToken = null;
        do
        {
            var start = Uri.EscapeDataString($"{startDate:yyyy-MM-dd}T00:00:00Z");
            var end = Uri.EscapeDataString($"{endDate:yyyy-MM-dd}T00:00:00Z");
            var pageQuery = string.IsNullOrEmpty(pageToken) ? string.Empty : $"&pageToken={Uri.EscapeDataString(pageToken)}";
            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"{EventsEndpoint}?timeMin={start}&timeMax={end}&singleEvents=true&showDeleted=false&maxResults=2500{pageQuery}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            using var response = await httpClient.SendAsync(request, cancellationToken);
            await EnsureGoogleSuccessAsync(response);
            var page = await response.Content.ReadFromJsonAsync<GoogleEventsPage>(JsonOptions, cancellationToken)
                ?? throw new HttpRequestException("Google Calendar returned an empty events response.");
            events.AddRange(page.Items ?? []);
            pageToken = page.NextPageToken;
        } while (!string.IsNullOrEmpty(pageToken));

        return events;
    }

    private async Task CreateEventAsync(
        string accessToken,
        GoogleEventResource calendarEvent,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, EventsEndpoint)
        {
            Content = JsonContent.Create(calendarEvent, options: JsonOptions),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);
        await EnsureGoogleSuccessAsync(response);
    }

    private async Task DeleteEventAsync(string accessToken, string googleEventId, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Delete,
            $"{EventsEndpoint}/{Uri.EscapeDataString(googleEventId)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode != HttpStatusCode.NotFound)
        {
            await EnsureGoogleSuccessAsync(response);
        }
    }

    private async Task DeleteOwnedEventAsync(
        string accessToken,
        GoogleCalendarDeletedEvent deletedEvent,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{EventsEndpoint}/{Uri.EscapeDataString(deletedEvent.GoogleEventId!)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound) return;
        await EnsureGoogleSuccessAsync(response);

        var calendarEvent = await response.Content.ReadFromJsonAsync<GoogleEventResource>(JsonOptions, cancellationToken)
            ?? throw new HttpRequestException("Google Calendar returned an empty event response.");
        var linkedAppEventId = calendarEvent.ExtendedProperties?.Private?.GetValueOrDefault("lichvietAppEventId");
        if (!string.Equals(linkedAppEventId, deletedEvent.Id, StringComparison.Ordinal))
        {
            throw new GoogleCalendarUnauthorizedException("Refusing to delete an event not owned by Lịch Việt.");
        }

        await DeleteEventAsync(accessToken, deletedEvent.GoogleEventId!, cancellationToken);
    }

    private static GoogleEventResource ToGoogleResource(GoogleCalendarAppEvent appEvent)
    {
        var endDate = appEvent.EndDate ?? appEvent.StartDate.AddDays(1);
        if (endDate <= appEvent.StartDate)
        {
            throw new ArgumentOutOfRangeException(nameof(appEvent), "Calendar event end date must be after its start date.");
        }

        return new GoogleEventResource
        {
            Summary = appEvent.Summary,
            Description = appEvent.Description,
            Start = new GoogleEventDate { Date = appEvent.StartDate.ToString("yyyy-MM-dd") },
            End = new GoogleEventDate { Date = endDate.ToString("yyyy-MM-dd") },
            ExtendedProperties = new GoogleExtendedProperties
            {
                Private = new Dictionary<string, string> { ["lichvietAppEventId"] = appEvent.Id },
            },
        };
    }

    private static GoogleCalendarEvent ToResponse(GoogleEventResource calendarEvent)
    {
        var start = calendarEvent.Start?.DateTime ?? calendarEvent.Start?.Date;
        var end = calendarEvent.End?.DateTime ?? calendarEvent.End?.Date;
        return new GoogleCalendarEvent(
            calendarEvent.Id ?? string.Empty,
            string.IsNullOrWhiteSpace(calendarEvent.Summary) ? "(Không có tiêu đề)" : calendarEvent.Summary,
            calendarEvent.Description,
            start ?? string.Empty,
            end ?? string.Empty,
            calendarEvent.Start?.DateTime is null,
            calendarEvent.HtmlLink,
            calendarEvent.ExtendedProperties?.Private?.GetValueOrDefault("lichvietAppEventId"));
    }

    private static List<KeyValuePair<string, string>> CreateTokenForm(params (string Key, string Value)[] values) =>
        values.Select(value => new KeyValuePair<string, string>(value.Key, value.Value)).ToList();

    private async Task<GoogleTokenResponse> ReadTokenResponseAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        if (!response.IsSuccessStatusCode)
        {
            if (response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.Unauthorized)
            {
                throw new GoogleCalendarUnauthorizedException("Google rejected the Calendar authorization. Reconnect the Google account.");
            }

            throw new HttpRequestException($"Google OAuth returned HTTP {(int)response.StatusCode}.");
        }

        return await response.Content.ReadFromJsonAsync<GoogleTokenResponse>(JsonOptions, cancellationToken)
            ?? throw new HttpRequestException("Google OAuth returned an empty token response.");
    }

    private static Task EnsureGoogleSuccessAsync(HttpResponseMessage response)
    {
        if (response.IsSuccessStatusCode) return Task.CompletedTask;
        if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
        {
            throw new GoogleCalendarUnauthorizedException(
                "Google Calendar authorization expired or was revoked. Reconnect the Google account.");
        }

        throw new HttpRequestException($"Google Calendar returned HTTP {(int)response.StatusCode}.");
    }

    private void ValidateClientAndRedirect(string clientId, string redirectUri)
    {
        ValidateClient(clientId);
        var allowedRedirectUris = configuration.GetSection("GoogleAuth:AllowedRedirectUris").Get<string[]>() ?? [];
        if (!allowedRedirectUris.Contains(redirectUri, StringComparer.Ordinal))
        {
            throw new GoogleCalendarUnauthorizedException("The OAuth redirect URI is not allowed.");
        }
    }

    private void ValidateClient(string clientId)
    {
        var audiences = configuration.GetSection("GoogleAuth:Audiences").Get<string[]>() ?? [];
        if (!audiences.Contains(clientId, StringComparer.Ordinal))
        {
            throw new GoogleCalendarUnauthorizedException("The OAuth client is not allowed.");
        }
    }

    private void EnsureConfigured()
    {
        var audiences = configuration.GetSection("GoogleAuth:Audiences").Get<string[]>() ?? [];
        var redirectUris = configuration.GetSection("GoogleAuth:AllowedRedirectUris").Get<string[]>() ?? [];
        if (string.IsNullOrWhiteSpace(configuration["GoogleAuth:WebClientId"]) ||
            string.IsNullOrWhiteSpace(configuration["GoogleAuth:ClientSecret"]) ||
            string.IsNullOrWhiteSpace(configuration["GoogleAuth:DataProtectionKeysPath"]) ||
            !Directory.Exists(configuration["GoogleAuth:DataProtectionKeysPath"]) ||
            audiences.Length == 0 ||
            redirectUris.Length == 0)
        {
            throw new GoogleCalendarConfigurationException(
                "Google Calendar requires OAuth credentials, allowed redirect URIs, and a persistent data-protection key directory.");
        }
    }

    public sealed record CalendarAuthorizationTokens(string IdToken, string? RefreshToken);

    private sealed class GoogleTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; init; }

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; init; }

        [JsonPropertyName("id_token")]
        public string? IdToken { get; init; }

        [JsonPropertyName("scope")]
        public string? Scope { get; init; }
    }

    private sealed class GoogleEventsPage
    {
        [JsonPropertyName("items")]
        public List<GoogleEventResource>? Items { get; init; }

        [JsonPropertyName("nextPageToken")]
        public string? NextPageToken { get; init; }
    }

    private sealed class GoogleEventResource
    {
        [JsonPropertyName("id")]
        public string? Id { get; init; }

        [JsonPropertyName("summary")]
        public string? Summary { get; init; }

        [JsonPropertyName("description")]
        public string? Description { get; init; }

        [JsonPropertyName("start")]
        public GoogleEventDate? Start { get; init; }

        [JsonPropertyName("end")]
        public GoogleEventDate? End { get; init; }

        [JsonPropertyName("htmlLink")]
        public string? HtmlLink { get; init; }

        [JsonPropertyName("status")]
        public string? Status { get; init; }

        [JsonPropertyName("extendedProperties")]
        public GoogleExtendedProperties? ExtendedProperties { get; init; }
    }

    private sealed class GoogleEventDate
    {
        [JsonPropertyName("date")]
        public string? Date { get; init; }

        [JsonPropertyName("dateTime")]
        public string? DateTime { get; init; }
    }

    private sealed class GoogleExtendedProperties
    {
        [JsonPropertyName("private")]
        public Dictionary<string, string>? Private { get; init; }
    }
}
