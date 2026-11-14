using System.Text.Json;
using Microsoft.Data.SqlClient;

namespace VietCalendar.Api.Accounts;

public sealed class UserAccountRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<bool> GoogleAccountExistsAsync(
        string connectionString,
        string subject,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT COUNT(*) FROM dbo.AppUser WHERE GoogleSubject = @subject;",
            connection);
        command.Parameters.AddWithValue("@subject", subject);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken)) > 0;
    }

    public async Task<bool> EmailBelongsToAnotherAccountAsync(
        string connectionString,
        string email,
        string subject,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT COUNT(*) FROM dbo.AppUser WHERE Email = @email AND GoogleSubject <> @subject;",
            connection);
        command.Parameters.AddWithValue("@email", email);
        command.Parameters.AddWithValue("@subject", subject);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken)) > 0;
    }

    public async Task<GoogleCalendarTokenRecord?> GetCalendarTokenAsync(
        string connectionString,
        string subject,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT CalendarRefreshToken, CalendarClientId FROM dbo.AppUser WHERE GoogleSubject = @subject;",
            connection);
        command.Parameters.AddWithValue("@subject", subject);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken) ||
            reader.IsDBNull(0) ||
            reader.IsDBNull(1))
        {
            return null;
        }

        return new GoogleCalendarTokenRecord(reader.GetString(0), reader.GetString(1));
    }

    public async Task SaveProtectedCalendarRefreshTokenAsync(
        string connectionString,
        string subject,
        string protectedRefreshToken,
        string clientId,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            UPDATE dbo.AppUser
            SET CalendarRefreshToken = @token, CalendarClientId = @clientId, UpdatedAt = SYSUTCDATETIME()
            WHERE GoogleSubject = @subject;
            """,
            connection);
        command.Parameters.AddWithValue("@subject", subject);
        command.Parameters.Add("@token", System.Data.SqlDbType.NVarChar, -1).Value = protectedRefreshToken;
        command.Parameters.Add("@clientId", System.Data.SqlDbType.NVarChar, 512).Value = clientId;
        if (await command.ExecuteNonQueryAsync(cancellationToken) == 0)
        {
            throw new InvalidOperationException("The authenticated account was not found.");
        }
    }

    public async Task UpsertGoogleAccountAsync(
        string connectionString,
        GoogleAccount account,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(
            System.Data.IsolationLevel.Serializable, cancellationToken);
        await using var command = new SqlCommand(
            """
            IF EXISTS (
                SELECT 1 FROM dbo.AppUser WITH (UPDLOCK, HOLDLOCK)
                WHERE Email = @email AND GoogleSubject <> @subject)
            BEGIN
                SELECT 1;
            END
            ELSE
            BEGIN
            UPDATE dbo.AppUser
            SET Email = @email, DisplayName = @displayName, PictureUrl = @pictureUrl,
                UpdatedAt = SYSUTCDATETIME()
            WHERE GoogleSubject = @subject;

            IF @@ROWCOUNT = 0
            BEGIN
                INSERT INTO dbo.AppUser (GoogleSubject, Email, DisplayName, PictureUrl)
                VALUES (@subject, @email, @displayName, @pictureUrl);
            END;
            SELECT 0;
            END;
            """,
            connection,
            transaction);
        AddAccountParameters(command, account);
        if (Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken)) == 1)
        {
            throw new InvalidOperationException("The email is already registered to another account.");
        }
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task<CalendarUserSettings?> GetSettingsAsync(
        string connectionString,
        string subject,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT SettingsJson FROM dbo.AppUser WHERE GoogleSubject = @subject;",
            connection);
        command.Parameters.AddWithValue("@subject", subject);
        var value = await command.ExecuteScalarAsync(cancellationToken);
        if (value is not string json)
        {
            return null;
        }

        return JsonSerializer.Deserialize<CalendarUserSettings>(json, JsonOptions);
    }

    public async Task SaveSettingsAsync(
        string connectionString,
        string subject,
        CalendarUserSettings settings,
        CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(settings, JsonOptions);
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            UPDATE dbo.AppUser
            SET SettingsJson = @settings, UpdatedAt = SYSUTCDATETIME()
            WHERE GoogleSubject = @subject;
            """,
            connection);
        command.Parameters.AddWithValue("@subject", subject);
        command.Parameters.Add("@settings", System.Data.SqlDbType.NVarChar, -1).Value = json;
        if (await command.ExecuteNonQueryAsync(cancellationToken) == 0)
        {
            throw new InvalidOperationException("The authenticated account was not found.");
        }
    }

    private static void AddAccountParameters(SqlCommand command, GoogleAccount account)
    {
        command.Parameters.AddWithValue("@subject", account.Subject);
        command.Parameters.AddWithValue("@email", account.Email);
        command.Parameters.AddWithValue("@displayName", account.DisplayName);
        command.Parameters.Add("@pictureUrl", System.Data.SqlDbType.NVarChar, 2048).Value =
            (object?)account.PictureUrl ?? DBNull.Value;
    }
}
