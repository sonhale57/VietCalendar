using VietCalendar.Api.Calendar;

namespace VietCalendar.Api.Tests;

public sealed class VietnameseLunarCalendarTests
{
    private readonly VietnameseLunarCalendar _calendar = new();

    [Theory]
    [InlineData(2024, 2, 10, 1, 1, 2024)]
    [InlineData(2025, 1, 29, 1, 1, 2025)]
    [InlineData(2023, 1, 22, 1, 1, 2023)]
    [InlineData(2000, 2, 5, 1, 1, 2000)]
    public void ConvertsKnownVietnameseLunarNewYears(
        int year,
        int month,
        int day,
        int expectedLunarDay,
        int expectedLunarMonth,
        int expectedLunarYear)
    {
        var result = _calendar.GetDay(new DateOnly(year, month, day));

        Assert.Equal(expectedLunarDay, result.LunarDay);
        Assert.Equal(expectedLunarMonth, result.LunarMonth);
        Assert.Equal(expectedLunarYear, result.LunarYear);
        Assert.False(result.IsLeapMonth);
    }

    [Fact]
    public void MonthContainsEverySolarDateInOrder()
    {
        var days = _calendar.GetMonth(2024, 2);

        Assert.Equal(29, days.Count);
        Assert.Equal(new DateOnly(2024, 2, 1), days[0].SolarDate);
        Assert.Equal(new DateOnly(2024, 2, 29), days[^1].SolarDate);
        Assert.All(days, day => Assert.InRange(day.LunarDay, 1, 30));
    }

    [Fact]
    public void ConvertsDateBeforeLunarNewYear()
    {
        var result = _calendar.GetDay(new DateOnly(2024, 2, 1));

        Assert.Equal(22, result.LunarDay);
        Assert.Equal(12, result.LunarMonth);
        Assert.Equal(2023, result.LunarYear);
    }

    [Fact]
    public void IdentifiesVietnameseLeapMonth()
    {
        var result = _calendar.GetDay(new DateOnly(2023, 3, 22));

        Assert.Equal(1, result.LunarDay);
        Assert.Equal(2, result.LunarMonth);
        Assert.Equal(2023, result.LunarYear);
        Assert.True(result.IsLeapMonth);
    }

    [Fact]
    public void RejectsUnsupportedYear()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => _calendar.GetDay(new DateOnly(2101, 1, 1)));
    }
}
