namespace VietCalendar.Api.Calendar;

public sealed record CalendarDay(
    DateOnly SolarDate,
    int LunarDay,
    int LunarMonth,
    int LunarYear,
    bool IsLeapMonth,
    string Weekday,
    string DayCanChi,
    string MonthCanChi,
    string YearCanChi);
