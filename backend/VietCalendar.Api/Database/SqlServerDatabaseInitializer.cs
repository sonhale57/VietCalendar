using System.Data;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

namespace VietCalendar.Api.Database;

public sealed class SqlServerDatabaseInitializer(
    IConfiguration configuration,
    ILogger<SqlServerDatabaseInitializer> logger)
{
    private const string MigrationResourcePrefix = "VietCalendar.Api.Migrations.";
    private const string LunarAdviceResourceName = "VietCalendar.Api.Data.json_12_thang_am_lich.json";
    private static readonly Regex BatchSeparator = new(
        @"^[\t ]*GO[\t ]*(?:--.*)?\r?$",
        RegexOptions.IgnoreCase | RegexOptions.Multiline | RegexOptions.Compiled);

    public async Task InitializeAsync(CancellationToken cancellationToken)
    {
        var connectionString = configuration.GetConnectionString("CalendarDb");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("ConnectionStrings:CalendarDb must be configured before starting the API.");
        }

        var targetBuilder = new SqlConnectionStringBuilder(connectionString);
        var databaseName = targetBuilder.InitialCatalog;
        if (string.IsNullOrWhiteSpace(databaseName))
        {
            throw new InvalidOperationException("ConnectionStrings:CalendarDb must specify an Initial Catalog.");
        }

        await EnsureDatabaseExistsAsync(targetBuilder, databaseName, cancellationToken);

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await AcquireLockAsync(connection, $"VietCalendar.SchemaBootstrap:{databaseName}", cancellationToken);
        await EnsureMigrationHistoryAsync(connection, cancellationToken);
        await ApplyMigrationsAsync(connection, cancellationToken);
        await SeedLunarAdviceAsync(connection, cancellationToken);
        await ReleaseLockAsync(connection, $"VietCalendar.SchemaBootstrap:{databaseName}", cancellationToken);
    }

    private async Task EnsureDatabaseExistsAsync(
        SqlConnectionStringBuilder targetBuilder,
        string databaseName,
        CancellationToken cancellationToken)
    {
        var masterBuilder = new SqlConnectionStringBuilder(targetBuilder.ConnectionString)
        {
            InitialCatalog = "master",
        };
        var lockResource = $"VietCalendar.DatabaseBootstrap:{databaseName}";

        await using var connection = new SqlConnection(masterBuilder.ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            DECLARE @lockResult INT;
            EXEC @lockResult = sys.sp_getapplock
                @Resource = @LockResource,
                @LockMode = N'Exclusive',
                @LockOwner = N'Session',
                @LockTimeout = 60000;
            IF @lockResult < 0
                RAISERROR('Could not acquire the database bootstrap lock.', 16, 1);

            IF DB_ID(@DatabaseName) IS NULL
            BEGIN
                DECLARE @createDatabaseSql NVARCHAR(MAX) =
                    N'CREATE DATABASE ' + QUOTENAME(@DatabaseName);
                EXEC (@createDatabaseSql);
            END;

            EXEC sys.sp_releaseapplock
                @Resource = @LockResource,
                @LockOwner = N'Session';
            """,
            connection);
        command.CommandTimeout = 120;
        command.Parameters.Add("@LockResource", SqlDbType.NVarChar, 255).Value = lockResource;
        command.Parameters.Add("@DatabaseName", SqlDbType.NVarChar, 128).Value = databaseName;
        await command.ExecuteNonQueryAsync(cancellationToken);
        logger.LogInformation("Verified SQL Server database {DatabaseName}.", databaseName);
    }

    private static async Task AcquireLockAsync(
        SqlConnection connection,
        string lockResource,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(
            """
            DECLARE @lockResult INT;
            EXEC @lockResult = sys.sp_getapplock
                @Resource = @LockResource,
                @LockMode = N'Exclusive',
                @LockOwner = N'Session',
                @LockTimeout = 60000;
            IF @lockResult < 0
                RAISERROR('Could not acquire the schema migration lock.', 16, 1);
            """,
            connection);
        command.Parameters.Add("@LockResource", SqlDbType.NVarChar, 255).Value = lockResource;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task ReleaseLockAsync(
        SqlConnection connection,
        string lockResource,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(
            """
            EXEC sys.sp_releaseapplock
                @Resource = @LockResource,
                @LockOwner = N'Session';
            """,
            connection);
        command.Parameters.Add("@LockResource", SqlDbType.NVarChar, 255).Value = lockResource;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task EnsureMigrationHistoryAsync(
        SqlConnection connection,
        CancellationToken cancellationToken)
    {
        const string sql = """
            IF OBJECT_ID(N'dbo.__SchemaMigrations', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.__SchemaMigrations
                (
                    MigrationId NVARCHAR(255) NOT NULL CONSTRAINT PK_SchemaMigrations PRIMARY KEY,
                    AppliedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SchemaMigrations_AppliedAt DEFAULT (SYSUTCDATETIME())
                );
            END;
            """;
        await using var command = new SqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task ApplyMigrationsAsync(
        SqlConnection connection,
        CancellationToken cancellationToken)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var migrationResources = assembly.GetManifestResourceNames()
            .Where(name =>
                name.StartsWith(MigrationResourcePrefix, StringComparison.Ordinal) &&
                name.EndsWith(".sql", StringComparison.OrdinalIgnoreCase) &&
                !name.StartsWith($"{MigrationResourcePrefix}000-", StringComparison.Ordinal))
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToArray();

        if (migrationResources.Length == 0)
        {
            throw new InvalidOperationException("No embedded SQL migrations were found in the API assembly.");
        }

        var appliedMigrations = new HashSet<string>(StringComparer.Ordinal);
        await using (var command = new SqlCommand("SELECT MigrationId FROM dbo.__SchemaMigrations;", connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                appliedMigrations.Add(reader.GetString(0));
            }
        }

        foreach (var resourceName in migrationResources)
        {
            var migrationId = Path.GetFileNameWithoutExtension(resourceName);
            if (appliedMigrations.Contains(migrationId))
            {
                continue;
            }

            var migration = await ReadEmbeddedResourceAsync(assembly, resourceName, cancellationToken);
            foreach (var batch in BatchSeparator.Split(migration).Where(batch => !string.IsNullOrWhiteSpace(batch)))
            {
                await using var command = new SqlCommand(batch, connection)
                {
                    CommandTimeout = 120,
                };
                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            await using var recordMigration = new SqlCommand(
                "INSERT INTO dbo.__SchemaMigrations (MigrationId) VALUES (@MigrationId);",
                connection);
            recordMigration.Parameters.Add("@MigrationId", SqlDbType.NVarChar, 255).Value = migrationId;
            await recordMigration.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private async Task SeedLunarAdviceAsync(
        SqlConnection connection,
        CancellationToken cancellationToken)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var json = await ReadEmbeddedResourceAsync(assembly, LunarAdviceResourceName, cancellationToken);
        var version = ValidateLunarAdviceDocument(json);
        var contentHash = SHA256.HashData(Encoding.UTF8.GetBytes(json));

        await using var checkCommand = new SqlCommand(
            "SELECT ContentHash FROM dbo.LunarCalendarAdvice WHERE Id = 1;",
            connection);
        var storedHash = await checkCommand.ExecuteScalarAsync(cancellationToken) as byte[];
        if (storedHash is not null && CryptographicOperations.FixedTimeEquals(storedHash, contentHash))
        {
            return;
        }

        using var transaction = connection.BeginTransaction();
        await using var upsertCommand = new SqlCommand(
            """
            IF EXISTS (SELECT 1 FROM dbo.LunarCalendarAdvice WHERE Id = 1)
                UPDATE dbo.LunarCalendarAdvice
                SET DataVersion = @DataVersion,
                    ContentHash = @ContentHash,
                    JsonData = @JsonData,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE Id = 1;
            ELSE
                INSERT INTO dbo.LunarCalendarAdvice (Id, DataVersion, ContentHash, JsonData)
                VALUES (1, @DataVersion, @ContentHash, @JsonData);
            """,
            connection,
            transaction);
        upsertCommand.Parameters.Add("@DataVersion", SqlDbType.NVarChar, 32).Value = version;
        upsertCommand.Parameters.Add("@ContentHash", SqlDbType.VarBinary, 32).Value = contentHash;
        upsertCommand.Parameters.Add("@JsonData", SqlDbType.NVarChar, -1).Value = json;
        await upsertCommand.ExecuteNonQueryAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        logger.LogInformation("Seeded lunar calendar advice version {DataVersion}.", version);
    }

    private static string ValidateLunarAdviceDocument(string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        if (!root.TryGetProperty("metadata", out var metadata) ||
            !metadata.TryGetProperty("version", out var versionElement) ||
            versionElement.ValueKind != JsonValueKind.String ||
            string.IsNullOrWhiteSpace(versionElement.GetString()) ||
            versionElement.GetString()!.Length > 32 ||
            !metadata.TryGetProperty("description", out var description) ||
            description.ValueKind != JsonValueKind.String ||
            !metadata.TryGetProperty("short_month_rule", out var shortMonthRule) ||
            !shortMonthRule.TryGetProperty("base_days", out var baseDays) ||
            !IsLunarDayArray(baseDays) ||
            !shortMonthRule.TryGetProperty("short_month_days", out var shortMonthDays) ||
            !IsLunarDayArray(shortMonthDays) ||
            !root.TryGetProperty("common_templates", out var templates) ||
            !templates.TryGetProperty("THAP_TRAI", out var thapTraiTemplate) ||
            !IsAdviceTemplate(thapTraiTemplate) ||
            !templates.TryGetProperty("TKBG_GENERAL", out var tkbgTemplate) ||
            !IsAdviceTemplate(tkbgTemplate) ||
            !root.TryGetProperty("months", out var months) ||
            months.ValueKind != JsonValueKind.Array ||
            months.GetArrayLength() != 12)
        {
            throw new InvalidDataException("The embedded lunar advice document is missing required fields.");
        }

        var monthNumbers = new HashSet<int>();
        foreach (var month in months.EnumerateArray())
        {
            if (!month.TryGetProperty("month", out var monthElement) ||
                !monthElement.TryGetInt32(out var monthNumber) ||
                monthNumber is < 1 or > 12 ||
                !monthNumbers.Add(monthNumber) ||
                !month.TryGetProperty("month_name", out var monthName) ||
                monthName.ValueKind != JsonValueKind.String ||
                string.IsNullOrWhiteSpace(monthName.GetString()) ||
                !month.TryGetProperty("month_theme", out var monthTheme) ||
                monthTheme.ValueKind != JsonValueKind.String ||
                !month.TryGetProperty("tkbg_days", out var days) ||
                days.ValueKind != JsonValueKind.Array)
            {
                throw new InvalidDataException("The embedded lunar advice document contains an invalid month.");
            }

            foreach (var day in days.EnumerateArray())
            {
                if (!day.TryGetProperty("day", out var dayElement) ||
                    !dayElement.TryGetInt32(out var dayNumber) ||
                    dayNumber is < 1 or > 30 ||
                    !day.TryGetProperty("level", out var level) ||
                    level.ValueKind != JsonValueKind.String ||
                    level.GetString() is not ("LOW" or "MEDIUM" or "HIGH") ||
                    !day.TryGetProperty("title", out var title) ||
                    title.ValueKind != JsonValueKind.String ||
                    string.IsNullOrWhiteSpace(title.GetString()) ||
                    !day.TryGetProperty("advice", out var advice) ||
                    advice.ValueKind != JsonValueKind.String ||
                    string.IsNullOrWhiteSpace(advice.GetString()))
                {
                    throw new InvalidDataException("The embedded lunar advice document contains an invalid day entry.");
                }
            }
        }

        if (monthNumbers.Count != 12)
        {
            throw new InvalidDataException("The embedded lunar advice document must define all 12 lunar months.");
        }

        return versionElement.GetString()!;
    }

    private static bool IsLunarDayArray(JsonElement value) =>
        value.ValueKind == JsonValueKind.Array &&
        value.EnumerateArray().All(day =>
            day.TryGetInt32(out var dayNumber) && dayNumber is >= 1 and <= 30);

    private static bool IsAdviceTemplate(JsonElement value) =>
        value.ValueKind == JsonValueKind.Object &&
        value.TryGetProperty("badge", out var badge) &&
        badge.ValueKind == JsonValueKind.String &&
        value.TryGetProperty("color_hex", out var color) &&
        color.ValueKind == JsonValueKind.String &&
        value.TryGetProperty("short_advice", out var shortAdvice) &&
        shortAdvice.ValueKind == JsonValueKind.String &&
        value.TryGetProperty("detail", out var detail) &&
        detail.ValueKind == JsonValueKind.String;

    private static async Task<string> ReadEmbeddedResourceAsync(
        Assembly assembly,
        string resourceName,
        CancellationToken cancellationToken)
    {
        await using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Embedded resource {resourceName} was not found.");
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        return await reader.ReadToEndAsync(cancellationToken);
    }
}
