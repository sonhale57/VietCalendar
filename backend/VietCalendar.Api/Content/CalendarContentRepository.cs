using Microsoft.Data.SqlClient;

namespace VietCalendar.Api.Content;

public sealed class CalendarContentRepository
{
    public async Task<IReadOnlyList<CalendarHoliday>> GetHolidaysAsync(
        string connectionString,
        int month,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            SELECT Id, SolarMonth, SolarDay, LunarMonth, LunarDay, Title, Body, Category
            FROM dbo.CalendarContent
            WHERE IsActive = 1 AND SolarMonth = @month
            ORDER BY SolarDay, Title;
            """,
            connection);
        command.Parameters.AddWithValue("@month", month);

        var holidays = new List<CalendarHoliday>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            holidays.Add(new CalendarHoliday(
                reader.GetInt32(0),
                reader.GetByte(1),
                reader.GetByte(2),
                reader.IsDBNull(3) ? null : reader.GetByte(3),
                reader.IsDBNull(4) ? null : reader.GetByte(4),
                reader.GetString(5),
                reader.IsDBNull(6) ? null : reader.GetString(6),
                reader.GetString(7)));
        }

        return holidays;
    }
}
