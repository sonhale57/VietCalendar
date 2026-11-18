using System.Security.Cryptography;
using System.Text;

namespace VietCalendar.Api.Calendar;

public interface ICalendarEventService
{
    Task<IReadOnlyList<CalendarEventResponse>> GetEventsAsync(string ownerSubject, CancellationToken cancellationToken);
    Task<CalendarEventResponse?> GetEventAsync(string ownerSubject, Guid id, CancellationToken cancellationToken);
    Task<CalendarEventResponse> CreateEventAsync(
        string ownerSubject,
        CreateCalendarEventRequest request,
        CancellationToken cancellationToken);
    Task<CalendarEventResponse?> UpdateEventAsync(
        string ownerSubject,
        Guid id,
        UpdateCalendarEventRequest request,
        CancellationToken cancellationToken);
    Task<bool> DeleteEventAsync(string ownerSubject, Guid id, CancellationToken cancellationToken);
    Task<string?> CreateShareLinkAsync(string ownerSubject, Guid id, CancellationToken cancellationToken);
    Task<CalendarEventResponse?> InviteUserAsync(
        string ownerSubject,
        Guid id,
        string identifier,
        CancellationToken cancellationToken);
    Task<SharedCalendarEventResponse?> GetSharedEventAsync(string token, CancellationToken cancellationToken);
    Task<CalendarEventImportResponse?> ImportSharedEventAsync(
        string ownerSubject,
        string token,
        CancellationToken cancellationToken);
}

public sealed class CalendarEventService(
    IConfiguration configuration,
    CalendarEventRepository repository) : ICalendarEventService
{
    public Task<IReadOnlyList<CalendarEventResponse>> GetEventsAsync(
        string ownerSubject,
        CancellationToken cancellationToken) =>
        repository.GetEventsAsync(GetConnectionString(), ownerSubject, cancellationToken);

    public Task<CalendarEventResponse?> GetEventAsync(
        string ownerSubject,
        Guid id,
        CancellationToken cancellationToken) =>
        repository.GetEventAsync(GetConnectionString(), ownerSubject, id, cancellationToken);

    public Task<CalendarEventResponse> CreateEventAsync(
        string ownerSubject,
        CreateCalendarEventRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Id == Guid.Empty)
        {
            throw new CalendarEventValidationException("Event ID is required.");
        }

        var fields = ValidateAndNormalize(
            request.Title,
            request.Description,
            request.Kind,
            request.CalendarType,
            request.Year,
            request.Month,
            request.Day,
            request.Recurrence,
            request.Label,
            request.Countdown);
        return repository.CreateEventAsync(GetConnectionString(), ownerSubject, request.Id, fields, cancellationToken);
    }

    public Task<CalendarEventResponse?> UpdateEventAsync(
        string ownerSubject,
        Guid id,
        UpdateCalendarEventRequest request,
        CancellationToken cancellationToken)
    {
        var fields = ValidateAndNormalize(
            request.Title,
            request.Description,
            request.Kind,
            request.CalendarType,
            request.Year,
            request.Month,
            request.Day,
            request.Recurrence,
            request.Label,
            request.Countdown);
        return repository.UpdateEventAsync(
            GetConnectionString(),
            ownerSubject,
            id,
            fields,
            request.UpdateSharedCopies,
            cancellationToken);
    }

    public Task<bool> DeleteEventAsync(string ownerSubject, Guid id, CancellationToken cancellationToken) =>
        repository.DeleteEventAsync(GetConnectionString(), ownerSubject, id, cancellationToken);

    public async Task<string?> CreateShareLinkAsync(
        string ownerSubject,
        Guid id,
        CancellationToken cancellationToken)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
        var tokenHash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return await repository.CreateShareLinkAsync(
            GetConnectionString(),
            ownerSubject,
            id,
            tokenHash,
            token,
            cancellationToken);
    }

    public Task<CalendarEventResponse?> InviteUserAsync(
        string ownerSubject,
        Guid id,
        string identifier,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(identifier) || identifier.Trim().Length > 320)
        {
            throw new CalendarEventValidationException("Enter a registered email or username.");
        }

        return repository.InviteUserAsync(
            GetConnectionString(),
            ownerSubject,
            id,
            identifier.Trim(),
            cancellationToken);
    }

    public Task<SharedCalendarEventResponse?> GetSharedEventAsync(
        string token,
        CancellationToken cancellationToken) =>
        repository.GetSharedEventAsync(GetConnectionString(), token, cancellationToken);

    public Task<CalendarEventImportResponse?> ImportSharedEventAsync(
        string ownerSubject,
        string token,
        CancellationToken cancellationToken) =>
        repository.ImportSharedEventAsync(GetConnectionString(), ownerSubject, token, cancellationToken);

    private string GetConnectionString() =>
        configuration.GetConnectionString("CalendarDb")
        ?? throw new InvalidOperationException("Calendar database is not configured.");

    private static CalendarEventFields ValidateAndNormalize(
        string title,
        string? description,
        string kind,
        string calendarType,
        int year,
        int month,
        int day,
        string recurrence,
        string? label,
        bool countdown)
    {
        title = title.Trim();
        description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        kind = kind.Trim().ToLowerInvariant();
        calendarType = calendarType.Trim().ToLowerInvariant();
        recurrence = recurrence.Trim().ToLowerInvariant();
        label = string.IsNullOrWhiteSpace(label) ? null : label.Trim();

        if (title.Length is < 1 or > 120)
            throw new CalendarEventValidationException("Title must contain 1 to 120 characters.");
        if (description?.Length > 2000)
            throw new CalendarEventValidationException("Description cannot exceed 2000 characters.");
        if (kind is not ("event" or "reminder"))
            throw new CalendarEventValidationException("Kind must be 'event' or 'reminder'.");
        if (calendarType is not ("solar" or "lunar"))
            throw new CalendarEventValidationException("CalendarType must be 'solar' or 'lunar'.");
        if (year is < 1900 or > 2100)
            throw new CalendarEventValidationException("Year must be between 1900 and 2100.");
        if (month is < 1 or > 12)
            throw new CalendarEventValidationException("Month must be between 1 and 12.");
        if (day < 1 || day > (calendarType == "lunar" ? 30 : DateTime.DaysInMonth(year, month)))
            throw new CalendarEventValidationException("Day is outside the selected month.");
        if (recurrence is not ("once" or "yearly"))
            throw new CalendarEventValidationException("Recurrence must be 'once' or 'yearly'.");
        if (label?.Length > 32)
            throw new CalendarEventValidationException("Label cannot exceed 32 characters.");

        return new CalendarEventFields(
            title,
            description,
            kind,
            calendarType,
            year,
            month,
            day,
            recurrence,
            label,
            countdown);
    }
}
