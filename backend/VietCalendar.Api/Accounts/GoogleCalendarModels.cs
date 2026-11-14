namespace VietCalendar.Api.Accounts;

public sealed record GoogleCalendarLinkRequest(
    string Code,
    string CodeVerifier,
    string RedirectUri,
    string ClientId);

public sealed record GoogleCalendarSyncRequest(
    DateOnly StartDate,
    DateOnly EndDate,
    GoogleCalendarAppEvent[] Events,
    GoogleCalendarDeletedEvent[] DeletedEvents);

public sealed record GoogleCalendarConnectionStatus(bool Connected);

public sealed record GoogleCalendarTokenRecord(string ProtectedRefreshToken, string ClientId);

public sealed record GoogleCalendarAppEvent(
    string Id,
    string Summary,
    string? Description,
    DateOnly StartDate,
    DateOnly? EndDate,
    string? GoogleEventId);

public sealed record GoogleCalendarDeletedEvent(string Id, string? GoogleEventId);

public sealed record GoogleCalendarEvent(
    string Id,
    string Summary,
    string? Description,
    string Start,
    string End,
    bool IsAllDay,
    string? HtmlLink,
    string? AppEventId);

public sealed record GoogleCalendarSyncResponse(GoogleCalendarEvent[] Events);

public sealed class GoogleCalendarConfigurationException(string message) : Exception(message);

public sealed class GoogleCalendarUnauthorizedException(string message) : Exception(message);
