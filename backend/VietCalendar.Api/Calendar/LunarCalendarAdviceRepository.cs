using Microsoft.Data.SqlClient;

namespace VietCalendar.Api.Calendar;

public sealed class LunarCalendarAdviceRepository
{
    public async Task<string?> GetDocumentJsonAsync(
        string connectionString,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT JsonData FROM dbo.LunarCalendarAdvice WHERE Id = 1;",
            connection);
        return await command.ExecuteScalarAsync(cancellationToken) as string;
    }
}
