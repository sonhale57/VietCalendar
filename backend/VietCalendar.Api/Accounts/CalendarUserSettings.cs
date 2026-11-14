namespace VietCalendar.Api.Accounts;

public sealed record CalendarUserSettings(
    string ProfileName,
    string[] RelativeNames,
    string BirthDate,
    string BirthCalendarType,
    string BirthHour,
    string Gender,
    int ThemeIndex,
    string NavigationStyle,
    string NavigationImage,
    string FastingMode,
    string[]? RelativeBirthDates = null,
    string[]? RelativeBirthCalendarTypes = null,
    string[]? RelativeGenders = null);

public sealed record GoogleAccount(
    string Subject,
    string Email,
    string DisplayName,
    string? PictureUrl);

public sealed record AccountResponse(GoogleAccount User, CalendarUserSettings? Settings);
