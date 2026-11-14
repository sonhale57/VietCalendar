namespace VietCalendar.Api.Calendar;

public sealed class VietnameseLunarCalendar
{
    private const double TimeZone = 7;
    private const double SynodicMonth = 29.530588853;
    private static readonly string[] Can = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
    private static readonly string[] Chi = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
    private static readonly string[] Weekdays = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

    public CalendarDay GetDay(DateOnly solarDate)
    {
        if (solarDate.Year is < 1900 or > 2100)
        {
            throw new ArgumentOutOfRangeException(nameof(solarDate), "Supported years are 1900 through 2100.");
        }

        var (lunarDay, lunarMonth, lunarYear, isLeapMonth) = ConvertToLunar(solarDate);
        var julianDay = JulianDayFromDate(solarDate.Day, solarDate.Month, solarDate.Year);
        var dayCanChi = $"{Can[PositiveModulo(julianDay + 9, 10)]} {Chi[PositiveModulo(julianDay + 1, 12)]}";
        var monthCanChi = $"{Can[PositiveModulo(lunarYear * 12 + lunarMonth + 3, 10)]} {Chi[PositiveModulo(lunarMonth + 1, 12)]}";
        var yearCanChi = $"{Can[PositiveModulo(lunarYear + 6, 10)]} {Chi[PositiveModulo(lunarYear + 8, 12)]}";

        return new CalendarDay(
            solarDate,
            lunarDay,
            lunarMonth,
            lunarYear,
            isLeapMonth,
            Weekdays[(int)solarDate.DayOfWeek],
            dayCanChi,
            monthCanChi,
            yearCanChi);
    }

    public IReadOnlyList<CalendarDay> GetMonth(int year, int month)
    {
        if (year is < 1900 or > 2100)
        {
            throw new ArgumentOutOfRangeException(nameof(year), "Supported years are 1900 through 2100.");
        }

        if (month is < 1 or > 12)
        {
            throw new ArgumentOutOfRangeException(nameof(month));
        }

        var numberOfDays = DateTime.DaysInMonth(year, month);
        return Enumerable.Range(1, numberOfDays)
            .Select(day => GetDay(new DateOnly(year, month, day)))
            .ToArray();
    }

    private static (int Day, int Month, int Year, bool IsLeapMonth) ConvertToLunar(DateOnly solarDate)
    {
        var dayNumber = JulianDayFromDate(solarDate.Day, solarDate.Month, solarDate.Year);
        var monthStart = NewMoonDay(
            (int)Math.Floor((dayNumber - 2415021.076998695) / SynodicMonth),
            TimeZone);

        var month11 = GetLunarMonth11(solarDate.Year, TimeZone);
        var month11Next = month11;
        int lunarYear;

        if (month11 >= monthStart)
        {
            lunarYear = solarDate.Year;
            month11 = GetLunarMonth11(solarDate.Year - 1, TimeZone);
        }
        else
        {
            lunarYear = solarDate.Year + 1;
            month11Next = GetLunarMonth11(solarDate.Year + 1, TimeZone);
        }

        var monthIndex = (int)Math.Floor((monthStart - month11) / 29.0);
        var lunarMonth = monthIndex + 11;
        var leapMonthOffset = 0;
        if (month11Next - month11 > 365)
        {
            leapMonthOffset = GetLeapMonthOffset(month11, TimeZone);
            if (monthIndex >= leapMonthOffset)
            {
                lunarMonth = monthIndex + 10;
            }
        }

        if (lunarMonth > 12)
        {
            lunarMonth -= 12;
        }

        if (lunarMonth >= 11 && monthIndex < 4)
        {
            lunarYear--;
        }

        var lunarDay = dayNumber - monthStart + 1;
        return ((int)lunarDay, lunarMonth, lunarYear, monthIndex == leapMonthOffset && leapMonthOffset != 0);
    }

    private static int GetLunarMonth11(int year, double timeZone)
    {
        var offset = JulianDayFromDate(31, 12, year) - 2415021;
        var newMoonIndex = (int)Math.Floor(offset / SynodicMonth);
        var newMoon = NewMoonDay(newMoonIndex, timeZone);
        if (SunLongitude(newMoon, timeZone) >= 9)
        {
            newMoon = NewMoonDay(newMoonIndex - 1, timeZone);
        }

        return newMoon;
    }

    private static int GetLeapMonthOffset(int month11, double timeZone)
    {
        var newMoonIndex = (int)Math.Floor(0.5 + (month11 - 2415021.076998695) / SynodicMonth);
        var previousSector = -1;
        var monthOffset = 1;
        var sector = SunLongitude(NewMoonDay(newMoonIndex + monthOffset, timeZone), timeZone);

        while (sector != previousSector && monthOffset < 14)
        {
            previousSector = sector;
            monthOffset++;
            sector = SunLongitude(NewMoonDay(newMoonIndex + monthOffset, timeZone), timeZone);
        }

        return monthOffset - 1;
    }

    private static int NewMoonDay(int newMoonIndex, double timeZone)
    {
        var t = newMoonIndex / 1236.85;
        var t2 = t * t;
        var t3 = t2 * t;
        var dr = Math.PI / 180;
        var jd1 = 2415020.75933
            + SynodicMonth * newMoonIndex
            + 0.0001178 * t2
            - 0.000000155 * t3;
        jd1 += 0.00033 * Math.Sin((166.56 + 132.87 * t - 0.009173 * t2) * dr);

        var meanSun = 359.2242 + 29.10535608 * newMoonIndex - 0.0000333 * t2 - 0.00000347 * t3;
        var meanMoon = 306.0253 + 385.81691806 * newMoonIndex + 0.0107306 * t2 + 0.00001236 * t3;
        var moonArgument = 21.2964 + 390.67050646 * newMoonIndex - 0.0016528 * t2 - 0.00000239 * t3;
        var correction = (0.1734 - 0.000393 * t) * Math.Sin(meanSun * dr)
            + 0.0021 * Math.Sin(2 * meanSun * dr)
            - 0.4068 * Math.Sin(meanMoon * dr)
            + 0.0161 * Math.Sin(2 * meanMoon * dr)
            - 0.0004 * Math.Sin(3 * meanMoon * dr)
            + 0.0104 * Math.Sin(2 * moonArgument * dr)
            - 0.0051 * Math.Sin((meanSun + meanMoon) * dr)
            - 0.0074 * Math.Sin((meanSun - meanMoon) * dr)
            + 0.0004 * Math.Sin((2 * moonArgument + meanSun) * dr)
            - 0.0004 * Math.Sin((2 * moonArgument - meanSun) * dr)
            - 0.0006 * Math.Sin((2 * moonArgument + meanMoon) * dr)
            + 0.0010 * Math.Sin((2 * moonArgument - meanMoon) * dr)
            + 0.0005 * Math.Sin((2 * meanMoon + meanSun) * dr);

        var deltaT = t < -11
            ? 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
            : -0.000278 + 0.000265 * t + 0.000262 * t2;
        return (int)Math.Floor(jd1 + correction + deltaT + 0.5 + timeZone / 24);
    }

    private static int SunLongitude(int julianDay, double timeZone)
    {
        var t = (julianDay - 2451545.5 - timeZone / 24) / 36525;
        var t2 = t * t;
        var dr = Math.PI / 180;
        var meanAnomaly = 357.52910 + 35999.05030 * t - 0.0001559 * t2 - 0.00000048 * t * t2;
        var meanLongitude = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
        var equationOfCenter = (1.914600 - 0.004817 * t - 0.000014 * t2) * Math.Sin(dr * meanAnomaly)
            + (0.019993 - 0.000101 * t) * Math.Sin(2 * dr * meanAnomaly)
            + 0.000290 * Math.Sin(3 * dr * meanAnomaly);
        var longitude = (meanLongitude + equationOfCenter) * dr;
        longitude -= 2 * Math.PI * Math.Floor(longitude / (2 * Math.PI));
        return (int)Math.Floor(longitude / Math.PI * 6);
    }

    private static int JulianDayFromDate(int day, int month, int year)
    {
        var a = (14 - month) / 12;
        var y = year + 4800 - a;
        var m = month + 12 * a - 3;
        var julianDay = day + (153 * m + 2) / 5 + 365 * y + y / 4 - 32083;
        if (year > 1582 || (year == 1582 && (month > 10 || (month == 10 && day >= 15))))
        {
            julianDay += -y / 100 + y / 400 + 38;
        }

        return julianDay;
    }

    private static int PositiveModulo(int value, int modulus) => (value % modulus + modulus) % modulus;
}
