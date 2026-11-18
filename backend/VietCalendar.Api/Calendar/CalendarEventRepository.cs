using System.Data;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.SqlClient;

namespace VietCalendar.Api.Calendar;

public sealed class CalendarEventRepository
{
    private const string EventColumns =
        "CalendarEventId, Title, Description, EventKind, CalendarType, EventYear, EventMonth, EventDay, Recurrence, Label, IsCountdown, SourceEventId";

    public async Task<IReadOnlyList<CalendarEventResponse>> GetEventsAsync(
        string connectionString,
        string ownerSubject,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            $"SELECT {EventColumns} FROM dbo.CalendarEvent WHERE OwnerSubject = @owner ORDER BY EventYear, EventMonth, EventDay, Title;",
            connection);
        command.Parameters.Add("@owner", SqlDbType.NVarChar, 255).Value = ownerSubject;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var events = new List<CalendarEventResponse>();
        while (await reader.ReadAsync(cancellationToken))
        {
            events.Add(ReadEvent(reader));
        }

        return events;
    }

    public async Task<CalendarEventResponse?> GetEventAsync(
        string connectionString,
        string ownerSubject,
        Guid id,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        return await GetEventAsync(connection, null, ownerSubject, id, cancellationToken);
    }

    internal async Task<CalendarEventResponse> CreateEventAsync(
        string connectionString,
        string ownerSubject,
        Guid id,
        CalendarEventFields fields,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            INSERT INTO dbo.CalendarEvent
                (CalendarEventId, OwnerSubject, Title, Description, EventKind, CalendarType,
                 EventYear, EventMonth, EventDay, Recurrence, Label, IsCountdown)
            VALUES
                (@id, @owner, @title, @description, @kind, @calendarType,
                 @year, @month, @day, @recurrence, @label, @countdown);
            """,
            connection);
        AddEventParameters(command, ownerSubject, id, fields);
        await command.ExecuteNonQueryAsync(cancellationToken);
        return (await GetEventAsync(connection, null, ownerSubject, id, cancellationToken))!;
    }

    internal async Task<CalendarEventResponse?> UpdateEventAsync(
        string connectionString,
        string ownerSubject,
        Guid id,
        CalendarEventFields fields,
        bool updateSharedCopies,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            UPDATE dbo.CalendarEvent
            SET Title = @title, Description = @description, EventKind = @kind,
                CalendarType = @calendarType, EventYear = @year, EventMonth = @month,
                EventDay = @day, Recurrence = @recurrence, Label = @label, IsCountdown = @countdown,
                UpdatedAt = SYSUTCDATETIME()
            WHERE CalendarEventId = @id AND OwnerSubject = @owner;
            """,
            connection,
            transaction);
        AddEventParameters(command, ownerSubject, id, fields);
        if (await command.ExecuteNonQueryAsync(cancellationToken) == 0)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        if (updateSharedCopies)
        {
            await using var copyCommand = new SqlCommand(
                """
                UPDATE dbo.CalendarEvent
                SET Title = @title, Description = @description, EventKind = @kind,
                    CalendarType = @calendarType, EventYear = @year, EventMonth = @month,
                    EventDay = @day, Recurrence = @recurrence, Label = @label, IsCountdown = @countdown,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE SourceEventId = @id AND SourceOwnerSubject = @owner;
                """,
                connection,
                transaction);
            AddEventParameters(copyCommand, ownerSubject, id, fields);
            await copyCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return await GetEventAsync(connection, null, ownerSubject, id, cancellationToken);
    }

    public async Task<bool> DeleteEventAsync(
        string connectionString,
        string ownerSubject,
        Guid id,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "DELETE FROM dbo.CalendarEvent WHERE CalendarEventId = @id AND OwnerSubject = @owner;",
            connection);
        command.Parameters.Add("@id", SqlDbType.UniqueIdentifier).Value = id;
        command.Parameters.Add("@owner", SqlDbType.NVarChar, 255).Value = ownerSubject;
        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    public async Task<string?> CreateShareLinkAsync(
        string connectionString,
        string ownerSubject,
        Guid id,
        byte[] tokenHash,
        string token,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            INSERT INTO dbo.CalendarEventShare (ShareId, CalendarEventId, ShareTokenHash)
            SELECT @shareId, CalendarEventId, @tokenHash
            FROM dbo.CalendarEvent
            WHERE CalendarEventId = @eventId AND OwnerSubject = @owner;
            """,
            connection);
        command.Parameters.Add("@shareId", SqlDbType.UniqueIdentifier).Value = Guid.NewGuid();
        command.Parameters.Add("@eventId", SqlDbType.UniqueIdentifier).Value = id;
        command.Parameters.Add("@owner", SqlDbType.NVarChar, 255).Value = ownerSubject;
        command.Parameters.Add("@tokenHash", SqlDbType.Binary, 32).Value = tokenHash;
        return await command.ExecuteNonQueryAsync(cancellationToken) == 0 ? null : token;
    }

    public async Task<CalendarEventResponse?> InviteUserAsync(
        string connectionString,
        string ownerSubject,
        Guid id,
        string identifier,
        CancellationToken cancellationToken)
    {
        var normalizedIdentifier = identifier.ToLowerInvariant();
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var recipientSubject = await FindAccountSubjectAsync(
            connection,
            transaction,
            normalizedIdentifier,
            cancellationToken);
        if (recipientSubject is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        if (string.Equals(recipientSubject, ownerSubject, StringComparison.Ordinal))
        {
            throw new CalendarEventConflictException("You cannot share an event with your own account.");
        }

        var source = await GetEventAsync(connection, transaction, ownerSubject, id, cancellationToken);
        if (source is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        var existing = await GetImportedEventAsync(
            connection,
            transaction,
            recipientSubject,
            ownerSubject,
            id,
            cancellationToken);
        if (existing is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return existing;
        }

        var copyId = Guid.NewGuid();
        await InsertSharedCopyAsync(
            connection,
            transaction,
            recipientSubject,
            ownerSubject,
            id,
            copyId,
            source,
            cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await GetEventAsync(connection, null, recipientSubject, copyId, cancellationToken);
    }

    public async Task<SharedCalendarEventResponse?> GetSharedEventAsync(
        string connectionString,
        string token,
        CancellationToken cancellationToken)
    {
        var tokenHash = HashToken(token);
        if (tokenHash is null)
        {
            return null;
        }

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            $"""
            SELECT {string.Join(", ", EventColumns.Split(", ").Select(column => $"e.{column}"))}, u.DisplayName
            FROM dbo.CalendarEventShare s
            INNER JOIN dbo.CalendarEvent e ON e.CalendarEventId = s.CalendarEventId
            INNER JOIN dbo.AppUser u ON u.GoogleSubject = e.OwnerSubject
            WHERE s.ShareTokenHash = @tokenHash AND s.RevokedAt IS NULL;
            """,
            connection);
        command.Parameters.Add("@tokenHash", SqlDbType.Binary, 32).Value = tokenHash;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new SharedCalendarEventResponse(ReadEvent(reader), reader.GetString(12));
    }

    public async Task<CalendarEventImportResponse?> ImportSharedEventAsync(
        string connectionString,
        string ownerSubject,
        string token,
        CancellationToken cancellationToken)
    {
        var tokenHash = HashToken(token);
        if (tokenHash is null)
        {
            return null;
        }

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);
        await using var sourceCommand = new SqlCommand(
            $"""
            SELECT {string.Join(", ", EventColumns.Split(", ").Select(column => $"e.{column}"))}, e.OwnerSubject
            FROM dbo.CalendarEventShare s
            INNER JOIN dbo.CalendarEvent e ON e.CalendarEventId = s.CalendarEventId
            WHERE s.ShareTokenHash = @tokenHash AND s.RevokedAt IS NULL;
            """,
            connection,
            transaction);
        sourceCommand.Parameters.Add("@tokenHash", SqlDbType.Binary, 32).Value = tokenHash;
        CalendarEventResponse? source;
        string? sourceOwner;
        await using (var reader = await sourceCommand.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                await transaction.RollbackAsync(cancellationToken);
                return null;
            }

            source = ReadEvent(reader);
            sourceOwner = reader.GetString(12);
        }

        if (string.Equals(sourceOwner, ownerSubject, StringComparison.Ordinal))
        {
            throw new CalendarEventConflictException("This event is already in your calendar.");
        }

        var existing = await GetImportedEventAsync(
            connection,
            transaction,
            ownerSubject,
            sourceOwner,
            source.Id,
            cancellationToken);
        if (existing is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return new CalendarEventImportResponse(existing, true);
        }

        var copyId = Guid.NewGuid();
        await InsertSharedCopyAsync(
            connection,
            transaction,
            ownerSubject,
            sourceOwner,
            source.Id,
            copyId,
            source,
            cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        var imported = await GetEventAsync(connection, null, ownerSubject, copyId, cancellationToken);
        return imported is null ? null : new CalendarEventImportResponse(imported, false);
    }

    private static async Task<CalendarEventResponse?> GetEventAsync(
        SqlConnection connection,
        SqlTransaction? transaction,
        string ownerSubject,
        Guid id,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(
            $"SELECT {EventColumns} FROM dbo.CalendarEvent WHERE CalendarEventId = @id AND OwnerSubject = @owner;",
            connection,
            transaction);
        command.Parameters.Add("@id", SqlDbType.UniqueIdentifier).Value = id;
        command.Parameters.Add("@owner", SqlDbType.NVarChar, 255).Value = ownerSubject;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadEvent(reader) : null;
    }

    private static async Task<CalendarEventResponse?> GetImportedEventAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        string ownerSubject,
        string sourceOwnerSubject,
        Guid sourceId,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(
            $"""
            SELECT {EventColumns} FROM dbo.CalendarEvent
            WHERE OwnerSubject = @owner AND SourceOwnerSubject = @sourceOwner AND SourceEventId = @sourceId;
            """,
            connection,
            transaction);
        command.Parameters.Add("@owner", SqlDbType.NVarChar, 255).Value = ownerSubject;
        command.Parameters.Add("@sourceOwner", SqlDbType.NVarChar, 255).Value = sourceOwnerSubject;
        command.Parameters.Add("@sourceId", SqlDbType.UniqueIdentifier).Value = sourceId;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadEvent(reader) : null;
    }

    private static async Task<string?> FindAccountSubjectAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        string normalizedIdentifier,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(
            """
            SELECT TOP (1) u.GoogleSubject
            FROM dbo.AppUser u
            LEFT JOIN dbo.LocalCredential c ON c.GoogleSubject = u.GoogleSubject
            WHERE LOWER(u.Email) = @identifier OR c.NormalizedUsername = @identifier;
            """,
            connection,
            transaction);
        command.Parameters.Add("@identifier", SqlDbType.NVarChar, 320).Value = normalizedIdentifier;
        return await command.ExecuteScalarAsync(cancellationToken) as string;
    }

    private static async Task InsertSharedCopyAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        string recipientSubject,
        string sourceOwnerSubject,
        Guid sourceId,
        Guid copyId,
        CalendarEventResponse source,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(
            """
            INSERT INTO dbo.CalendarEvent
                (CalendarEventId, OwnerSubject, Title, Description, EventKind, CalendarType,
                 EventYear, EventMonth, EventDay, Recurrence, Label, IsCountdown,
                 SourceEventId, SourceOwnerSubject)
            VALUES
                (@id, @owner, @title, @description, @kind, @calendarType,
                 @year, @month, @day, @recurrence, @label, @countdown,
                 @sourceId, @sourceOwner);
            """,
            connection,
            transaction);
        command.Parameters.Add("@id", SqlDbType.UniqueIdentifier).Value = copyId;
        command.Parameters.Add("@owner", SqlDbType.NVarChar, 255).Value = recipientSubject;
        command.Parameters.Add("@title", SqlDbType.NVarChar, 120).Value = source.Title;
        command.Parameters.Add("@description", SqlDbType.NVarChar, 2000).Value =
            (object?)source.Description ?? DBNull.Value;
        command.Parameters.Add("@kind", SqlDbType.VarChar, 8).Value = source.Kind;
        command.Parameters.Add("@calendarType", SqlDbType.VarChar, 6).Value = source.CalendarType;
        command.Parameters.Add("@year", SqlDbType.SmallInt).Value = source.Year;
        command.Parameters.Add("@month", SqlDbType.TinyInt).Value = source.Month;
        command.Parameters.Add("@day", SqlDbType.TinyInt).Value = source.Day;
        command.Parameters.Add("@recurrence", SqlDbType.VarChar, 8).Value = source.Recurrence;
        command.Parameters.Add("@label", SqlDbType.NVarChar, 32).Value = (object?)source.Label ?? DBNull.Value;
        command.Parameters.Add("@countdown", SqlDbType.Bit).Value = source.Countdown;
        command.Parameters.Add("@sourceId", SqlDbType.UniqueIdentifier).Value = sourceId;
        command.Parameters.Add("@sourceOwner", SqlDbType.NVarChar, 255).Value = sourceOwnerSubject;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static void AddEventParameters(
        SqlCommand command,
        string ownerSubject,
        Guid id,
        CalendarEventFields fields)
    {
        command.Parameters.Add("@id", SqlDbType.UniqueIdentifier).Value = id;
        command.Parameters.Add("@owner", SqlDbType.NVarChar, 255).Value = ownerSubject;
        command.Parameters.Add("@title", SqlDbType.NVarChar, 120).Value = fields.Title;
        command.Parameters.Add("@description", SqlDbType.NVarChar, 2000).Value =
            (object?)fields.Description ?? DBNull.Value;
        command.Parameters.Add("@kind", SqlDbType.VarChar, 8).Value = fields.Kind;
        command.Parameters.Add("@calendarType", SqlDbType.VarChar, 6).Value = fields.CalendarType;
        command.Parameters.Add("@year", SqlDbType.SmallInt).Value = fields.Year;
        command.Parameters.Add("@month", SqlDbType.TinyInt).Value = fields.Month;
        command.Parameters.Add("@day", SqlDbType.TinyInt).Value = fields.Day;
        command.Parameters.Add("@recurrence", SqlDbType.VarChar, 8).Value = fields.Recurrence;
        command.Parameters.Add("@label", SqlDbType.NVarChar, 32).Value = (object?)fields.Label ?? DBNull.Value;
        command.Parameters.Add("@countdown", SqlDbType.Bit).Value = fields.Countdown;
    }

    private static CalendarEventResponse ReadEvent(SqlDataReader reader)
    {
        var sourceEventId = reader.IsDBNull(11) ? (Guid?)null : reader.GetGuid(11);
        return new CalendarEventResponse(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetString(2),
            reader.GetString(3),
            reader.GetString(4),
            reader.GetInt16(5),
            reader.GetByte(6),
            reader.GetByte(7),
            reader.GetString(8),
            reader.IsDBNull(9) ? null : reader.GetString(9),
            reader.GetBoolean(10),
            sourceEventId,
            sourceEventId.HasValue);
    }

    private static byte[]? HashToken(string token)
    {
        if (token.Length != 43 || token.Any(character =>
            !(character is >= 'A' and <= 'Z') &&
            !(character is >= 'a' and <= 'z') &&
            !(character is >= '0' and <= '9') &&
            character is not '-' and not '_'))
        {
            return null;
        }

        return SHA256.HashData(Encoding.UTF8.GetBytes(token));
    }
}
