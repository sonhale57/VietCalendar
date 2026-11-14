namespace VietCalendar.Api.Content;

public sealed record CalendarHoliday(
    int Id,
    int SolarMonth,
    int SolarDay,
    int? LunarMonth,
    int? LunarDay,
    string Title,
    string? Body,
    string Category);
