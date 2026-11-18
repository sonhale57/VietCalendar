namespace VietCalendar.Api.Calendar;

/// <summary>Fields used to create a calendar event or reminder.</summary>
public sealed record CreateCalendarEventRequest(
    Guid Id,
    string Title,
    string? Description,
    string Kind,
    string CalendarType,
    int Year,
    int Month,
    int Day,
    string Recurrence,
    string? Label,
    bool Countdown);

/// <summary>Fields used to update an event and optionally propagate its changes to shared copies.</summary>
public sealed record UpdateCalendarEventRequest(
    string Title,
    string? Description,
    string Kind,
    string CalendarType,
    int Year,
    int Month,
    int Day,
    string Recurrence,
    string? Label,
    bool Countdown,
    bool UpdateSharedCopies);

/// <summary>A calendar event or reminder owned by the authenticated account.</summary>
public sealed record CalendarEventResponse(
    Guid Id,
    string Title,
    string? Description,
    string Kind,
    string CalendarType,
    int Year,
    int Month,
    int Day,
    string Recurrence,
    string? Label,
    bool Countdown,
    Guid? SourceEventId,
    bool IsSharedCopy);

/// <summary>A request to add an event to another registered user's calendar.</summary>
public sealed record CalendarEventInviteRequest(string Identifier);

/// <summary>A share token that the client can place in an app link.</summary>
public sealed record CalendarEventShareLinkResponse(string Token);

/// <summary>A calendar event returned for preview from a share link.</summary>
public sealed record SharedCalendarEventResponse(CalendarEventResponse Event, string OwnerName);

/// <summary>The result of adding an event shared by link to an account calendar.</summary>
public sealed record CalendarEventImportResponse(CalendarEventResponse Event, bool AlreadyImported);

internal sealed record CalendarEventFields(
    string Title,
    string? Description,
    string Kind,
    string CalendarType,
    int Year,
    int Month,
    int Day,
    string Recurrence,
    string? Label,
    bool Countdown);

internal sealed class CalendarEventValidationException(string message) : Exception(message);
internal sealed class CalendarEventConflictException(string message) : Exception(message);
