using System.Data;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;

namespace VietCalendar.Api.Accounts;

public sealed class LocalAccountService(
    IConfiguration configuration,
    UserAccountRepository accounts,
    EmailOtpSender emailSender)
{
    private const int OtpLifetimeMinutes = 10;
    private const int OtpResendDelaySeconds = 60;
    private const int MaxOtpAttempts = 5;
    private const int SessionLifetimeDays = 30;
    private static readonly PasswordHasher<object> PasswordHasher = new();
    private static readonly string DummyPasswordHash =
        PasswordHasher.HashPassword(new object(), "not-a-user-password");
    private static readonly Regex UsernamePattern = new("^[A-Za-z0-9._-]{3,32}$", RegexOptions.Compiled);

    private string ConnectionString => configuration.GetConnectionString("CalendarDb")
        ?? throw new AuthConfigurationException("Account database is not configured.");

    public async Task RequestRegistrationCodeAsync(string email, CancellationToken cancellationToken)
    {
        var normalizedEmail = NormalizeEmail(email);
        if (await IsEmailRegisteredAsync(normalizedEmail, cancellationToken))
        {
            throw new AuthConflictException("Email này đã có tài khoản.");
        }

        await IssueCodeAsync(normalizedEmail, "register", cancellationToken);
    }

    public async Task<AuthSessionResponse> RegisterAsync(
        EmailRegistrationRequest request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        var legacyVerifiedRegistration = !string.IsNullOrWhiteSpace(request.Code);
        if (legacyVerifiedRegistration) ValidateCode(request.Code!);
        ValidateUsername(request.Username);
        ValidatePassword(request.Password);
        var isAdmin = IsAdmin(email);

        var username = request.Username.Trim();
        var passwordHash = PasswordHasher.HashPassword(new object(), request.Password);
        var subject = $"local:{Guid.NewGuid():N}";
        var user = new GoogleAccount(subject, email, username, null);
        var connectionString = ConnectionString;
        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);

        if (legacyVerifiedRegistration)
        {
            await ConsumeCodeAsync(connection, transaction, email, request.Code!, "register", cancellationToken);
        }
        await using (var command = new SqlCommand(
            """
            IF NOT EXISTS (SELECT 1 FROM dbo.AppUser WITH (UPDLOCK, HOLDLOCK) WHERE Email = @email)
               AND NOT EXISTS (SELECT 1 FROM dbo.LocalCredential WITH (UPDLOCK, HOLDLOCK)
                               WHERE NormalizedEmail IN (@email, @username)
                                  OR NormalizedUsername IN (@email, @username))
            BEGIN
                INSERT INTO dbo.AppUser (GoogleSubject, Email, DisplayName, PictureUrl)
                VALUES (@subject, @email, @displayName, NULL);

                INSERT INTO dbo.LocalCredential (GoogleSubject, NormalizedEmail, NormalizedUsername, PasswordHash, EmailVerified)
                VALUES (@subject, @email, @username, @passwordHash, @emailVerified);
                SELECT 0;
            END
            ELSE SELECT 1;
            """,
            connection,
            transaction))
        {
            command.Parameters.AddWithValue("@email", email);
            command.Parameters.AddWithValue("@username", username.ToLowerInvariant());
            command.Parameters.AddWithValue("@subject", subject);
            command.Parameters.AddWithValue("@displayName", username);
            command.Parameters.AddWithValue("@passwordHash", passwordHash);
            command.Parameters.AddWithValue("@emailVerified", legacyVerifiedRegistration);
            var result = Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
            if (result == 1)
            {
                throw new AuthConflictException("Email hoặc username này đã được sử dụng.");
            }
        }

        await using (var settingsCommand = new SqlCommand(
            "SELECT SettingsJson FROM dbo.AppUser WHERE GoogleSubject = @subject;",
            connection,
            transaction))
        {
            settingsCommand.Parameters.AddWithValue("@subject", subject);
            await settingsCommand.ExecuteScalarAsync(cancellationToken);
        }

        var token = await CreateSessionAsync(connection, transaction, subject, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        var settings = await accounts.GetSettingsAsync(connectionString, subject, cancellationToken);
        return new AuthSessionResponse(
            token,
            user,
            settings,
            IsAdmin(email),
            HasPassword: true,
            EmailVerified: legacyVerifiedRegistration);
    }

    public async Task<AuthSessionResponse> SignInAsync(
        EmailLoginRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.UsernameOrEmail) || string.IsNullOrEmpty(request.Password))
        {
            throw new AuthValidationException("Username/email hoặc mật khẩu không chính xác.");
        }
        var value = request.UsernameOrEmail.Trim().ToLowerInvariant();
        string? subject = null;
        string? email = null;
        string? displayName = null;
        string? passwordHash = null;
        var emailVerified = false;

        await using (var connection = new SqlConnection(ConnectionString))
        {
            await connection.OpenAsync(cancellationToken);
            await using var command = new SqlCommand(
                """
                SELECT c.GoogleSubject, c.NormalizedEmail, u.DisplayName, c.PasswordHash, c.EmailVerified
                FROM dbo.LocalCredential c
                INNER JOIN dbo.AppUser u ON u.GoogleSubject = c.GoogleSubject
                WHERE c.NormalizedUsername = @value OR c.NormalizedEmail = @value;
                """,
                connection);
            command.Parameters.AddWithValue("@value", value);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                subject = reader.GetString(0);
                email = reader.GetString(1);
                displayName = reader.GetString(2);
                passwordHash = reader.GetString(3);
                emailVerified = reader.GetBoolean(4);
            }
        }

        var verification = PasswordHasher.VerifyHashedPassword(
            new object(),
            passwordHash ?? DummyPasswordHash,
            request.Password);
        if (verification == PasswordVerificationResult.Failed || subject is null || email is null || displayName is null)
        {
            throw new AuthValidationException("Username/email hoặc mật khẩu không chính xác.");
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            var replacement = PasswordHasher.HashPassword(new object(), request.Password);
            await UpdatePasswordHashAsync(subject, replacement, cancellationToken);
        }

        var token = await CreateSessionAsync(subject, cancellationToken);
        var user = new GoogleAccount(subject, email, displayName, null);
        return new AuthSessionResponse(
            token,
            user,
            await accounts.GetSettingsAsync(ConnectionString, subject, cancellationToken),
            IsAdmin(email),
            HasPassword: true,
            EmailVerified: emailVerified);
    }

    public async Task<bool> IsEmailVerifiedAsync(string subject, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT EmailVerified FROM dbo.LocalCredential WHERE GoogleSubject = @subject;",
            connection);
        command.Parameters.AddWithValue("@subject", subject);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is not bool verified || verified;
    }

    public async Task RequestEmailVerificationCodeAsync(string subject, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT NormalizedEmail, EmailVerified FROM dbo.LocalCredential WHERE GoogleSubject = @subject;",
            connection);
        command.Parameters.AddWithValue("@subject", subject);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new AuthValidationException("Tài khoản này không cần xác minh email.");
        }
        var email = reader.GetString(0);
        if (reader.GetBoolean(1))
        {
            throw new AuthValidationException("Email này đã được xác minh.");
        }
        await reader.DisposeAsync();
        await IssueCodeAsync(email, "verify", cancellationToken);
    }

    public async Task VerifyEmailAsync(
        string subject,
        string code,
        CancellationToken cancellationToken)
    {
        ValidateCode(code);
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        string email;
        await using (var command = new SqlCommand(
            "SELECT NormalizedEmail FROM dbo.LocalCredential WITH (UPDLOCK, HOLDLOCK) WHERE GoogleSubject = @subject;",
            connection,
            transaction))
        {
            command.Parameters.AddWithValue("@subject", subject);
            email = await command.ExecuteScalarAsync(cancellationToken) as string
                ?? throw new AuthValidationException("Tài khoản này không cần xác minh email.");
        }
        await ConsumeCodeAsync(connection, transaction, email, code, "verify", cancellationToken);
        await using (var command = new SqlCommand(
            "UPDATE dbo.LocalCredential SET EmailVerified = 1 WHERE GoogleSubject = @subject;",
            connection,
            transaction))
        {
            command.Parameters.AddWithValue("@subject", subject);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task RequestPasswordResetCodeAsync(string email, CancellationToken cancellationToken)
    {
        var normalizedEmail = NormalizeEmail(email);
        if (await EmailExistsAsync(normalizedEmail, cancellationToken))
        {
            await IssueCodeAsync(normalizedEmail, "reset", cancellationToken);
        }
    }

    public async Task ResetPasswordAsync(PasswordResetRequest request, CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        ValidateCode(request.Code);
        ValidatePassword(request.NewPassword);
        var hash = PasswordHasher.HashPassword(new object(), request.NewPassword);

        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        await ConsumeCodeAsync(connection, transaction, email, request.Code, "reset", cancellationToken);
        await using var command = new SqlCommand(
            """
            UPDATE dbo.LocalCredential SET PasswordHash = @hash
            WHERE NormalizedEmail = @email;
            """,
            connection,
            transaction);
        command.Parameters.AddWithValue("@hash", hash);
        command.Parameters.AddWithValue("@email", email);
        if (await command.ExecuteNonQueryAsync(cancellationToken) == 0)
        {
            throw new AuthValidationException("Không thể đặt lại mật khẩu cho tài khoản này.");
        }
        await using (var revoke = new SqlCommand(
            "DELETE FROM dbo.AuthSession WHERE GoogleSubject = (SELECT GoogleSubject FROM dbo.LocalCredential WHERE NormalizedEmail = @email);",
            connection,
            transaction))
        {
            revoke.Parameters.AddWithValue("@email", email);
            await revoke.ExecuteNonQueryAsync(cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task ChangePasswordAsync(
        string subject,
        string currentSessionToken,
        PasswordChangeRequest request,
        CancellationToken cancellationToken)
    {
        ValidatePassword(request.NewPassword);
        if (string.IsNullOrEmpty(request.CurrentPassword))
        {
            throw new AuthValidationException("Mật khẩu hiện tại không chính xác hoặc tài khoản chưa đặt mật khẩu.");
        }
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        string? oldHash;
        await using (var command = new SqlCommand(
            "SELECT PasswordHash FROM dbo.LocalCredential WITH (UPDLOCK, HOLDLOCK) WHERE GoogleSubject = @subject;",
            connection,
            transaction))
        {
            command.Parameters.AddWithValue("@subject", subject);
            oldHash = await command.ExecuteScalarAsync(cancellationToken) as string;
        }
        if (oldHash is null ||
            PasswordHasher.VerifyHashedPassword(new object(), oldHash, request.CurrentPassword) ==
            PasswordVerificationResult.Failed)
        {
            throw new AuthValidationException("Mật khẩu hiện tại không chính xác hoặc tài khoản chưa đặt mật khẩu.");
        }

        await using (var update = new SqlCommand(
            "UPDATE dbo.LocalCredential SET PasswordHash = @hash WHERE GoogleSubject = @subject;",
            connection,
            transaction))
        {
            update.Parameters.AddWithValue("@hash", PasswordHasher.HashPassword(new object(), request.NewPassword));
            update.Parameters.AddWithValue("@subject", subject);
            await update.ExecuteNonQueryAsync(cancellationToken);
        }
        await using (var revoke = new SqlCommand(
            "DELETE FROM dbo.AuthSession WHERE GoogleSubject = @subject AND TokenHash <> @currentTokenHash;",
            connection,
            transaction))
        {
            revoke.Parameters.AddWithValue("@subject", subject);
            revoke.Parameters.Add("@currentTokenHash", SqlDbType.Binary, 32).Value = HashToken(currentSessionToken);
            await revoke.ExecuteNonQueryAsync(cancellationToken);
        }
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task RevokeSessionAsync(string token, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "DELETE FROM dbo.AuthSession WHERE TokenHash = @hash;",
            connection);
        command.Parameters.Add("@hash", SqlDbType.Binary, 32).Value = HashToken(token);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<string> CreateSessionForUserAsync(string subject, CancellationToken cancellationToken)
    {
        return await CreateSessionAsync(subject, cancellationToken);
    }

    public async Task<GoogleAccount?> GetSessionUserAsync(string token, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            SELECT u.GoogleSubject, u.Email, u.DisplayName, u.PictureUrl
            FROM dbo.AuthSession s
            INNER JOIN dbo.AppUser u ON u.GoogleSubject = s.GoogleSubject
            WHERE s.TokenHash = @hash AND s.ExpiresAt > SYSUTCDATETIME();
            """,
            connection);
        command.Parameters.Add("@hash", SqlDbType.Binary, 32).Value = HashToken(token);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken)
            ? new GoogleAccount(reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.IsDBNull(3) ? null : reader.GetString(3))
            : null;
    }

    public async Task<bool> HasPasswordAsync(string subject, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT COUNT(*) FROM dbo.LocalCredential WHERE GoogleSubject = @subject;",
            connection);
        command.Parameters.AddWithValue("@subject", subject);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken)) > 0;
    }

    public async Task<IReadOnlyList<EmailAllowlistRule>> GetAllowlistAsync(CancellationToken cancellationToken)
    {
        var rules = new List<EmailAllowlistRule>();
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT RuleId, RuleType, RuleValue FROM dbo.EmailRegistrationRule ORDER BY RuleType, RuleValue;",
            connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            rules.Add(new EmailAllowlistRule(reader.GetInt32(0), reader.GetString(1), reader.GetString(2)));
        }
        return rules;
    }

    public async Task<int> AddAllowlistRuleAsync(EmailAllowlistRuleRequest request, CancellationToken cancellationToken)
    {
        var (type, value) = NormalizeRule(request.Type, request.Value);
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            """
            IF EXISTS (SELECT 1 FROM dbo.EmailRegistrationRule WHERE RuleType = @type AND RuleValue = @value)
                SELECT RuleId FROM dbo.EmailRegistrationRule WHERE RuleType = @type AND RuleValue = @value;
            ELSE
            BEGIN
                INSERT INTO dbo.EmailRegistrationRule (RuleType, RuleValue) VALUES (@type, @value);
                SELECT CONVERT(INT, SCOPE_IDENTITY());
            END;
            """,
            connection);
        command.Parameters.AddWithValue("@type", type);
        command.Parameters.AddWithValue("@value", value);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
    }

    public async Task RemoveAllowlistRuleAsync(int id, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand("DELETE FROM dbo.EmailRegistrationRule WHERE RuleId = @id;", connection);
        command.Parameters.AddWithValue("@id", id);
        if (await command.ExecuteNonQueryAsync(cancellationToken) == 0)
        {
            throw new AuthValidationException("Không tìm thấy quy tắc cần xóa.");
        }
    }

    public static bool IsAdmin(IConfiguration configuration, string email)
    {
        var admins = configuration.GetSection("Auth:AdminEmails").Get<string[]>() ?? [];
        return admins.Any(admin => string.Equals(admin.Trim(), email, StringComparison.OrdinalIgnoreCase));
    }

    private bool IsAdmin(string email) => IsAdmin(configuration, email);

    private async Task IssueCodeAsync(string email, string purpose, CancellationToken cancellationToken)
    {
        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = HashOtpCode(code, salt);
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using (var transaction = (SqlTransaction)await connection.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken))
        {
            await using var cooldown = new SqlCommand(
                """
                SELECT COUNT(*) FROM dbo.AuthOtpChallenge WITH (UPDLOCK, HOLDLOCK)
                WHERE NormalizedEmail = @email AND Purpose = @purpose
                  AND CreatedAt > DATEADD(SECOND, -@resendDelay, SYSUTCDATETIME());
                """,
                connection,
                transaction);
            cooldown.Parameters.AddWithValue("@email", email);
            cooldown.Parameters.AddWithValue("@purpose", purpose);
            cooldown.Parameters.AddWithValue("@resendDelay", OtpResendDelaySeconds);
            if (Convert.ToInt32(await cooldown.ExecuteScalarAsync(cancellationToken)) > 0)
            {
                throw new AuthValidationException("Vui lòng đợi 60 giây trước khi yêu cầu mã mới.");
            }

            await using var command = new SqlCommand(
                """
                DELETE FROM dbo.AuthOtpChallenge WHERE NormalizedEmail = @email AND Purpose = @purpose;
                INSERT INTO dbo.AuthOtpChallenge (NormalizedEmail, Purpose, CodeSalt, CodeHash, ExpiresAt, Attempts, CreatedAt)
                VALUES (@email, @purpose, @salt, @hash, DATEADD(MINUTE, @lifetime, SYSUTCDATETIME()), 0, SYSUTCDATETIME());
                """,
                connection,
                transaction);
            command.Parameters.AddWithValue("@email", email);
            command.Parameters.AddWithValue("@purpose", purpose);
            command.Parameters.AddWithValue("@lifetime", OtpLifetimeMinutes);
            command.Parameters.Add("@salt", SqlDbType.Binary, 16).Value = salt;
            command.Parameters.Add("@hash", SqlDbType.Binary, 32).Value = hash;
            await command.ExecuteNonQueryAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        try
        {
            await emailSender.SendAsync(email, code, cancellationToken);
        }
        catch
        {
            await using var cleanup = new SqlCommand(
                "DELETE FROM dbo.AuthOtpChallenge WHERE NormalizedEmail = @email AND Purpose = @purpose;",
                connection);
            cleanup.Parameters.AddWithValue("@email", email);
            cleanup.Parameters.AddWithValue("@purpose", purpose);
            await cleanup.ExecuteNonQueryAsync(cancellationToken);
            throw;
        }
    }

    private async Task ConsumeCodeAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        string email,
        string code,
        string purpose,
        CancellationToken cancellationToken)
    {
        await using var select = new SqlCommand(
            """
            SELECT ChallengeId, CodeSalt, CodeHash, Attempts
            FROM dbo.AuthOtpChallenge WITH (UPDLOCK, HOLDLOCK)
            WHERE NormalizedEmail = @email AND Purpose = @purpose AND ExpiresAt > SYSUTCDATETIME();
            """,
            connection,
            transaction);
        select.Parameters.AddWithValue("@email", email);
        select.Parameters.AddWithValue("@purpose", purpose);
        int challengeId;
        byte[] salt;
        byte[] expectedHash;
        int attempts;
        await using (var reader = await select.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new AuthValidationException("Mã OTP không hợp lệ hoặc đã hết hạn.");
            }
            challengeId = reader.GetInt32(0);
            salt = (byte[])reader[1];
            expectedHash = (byte[])reader[2];
            attempts = reader.GetInt32(3);
        }

        if (attempts >= MaxOtpAttempts)
        {
            throw new AuthValidationException("Mã OTP đã vượt quá số lần thử. Hãy yêu cầu mã mới.");
        }

        var suppliedHash = HashOtpCode(code, salt);
        if (!CryptographicOperations.FixedTimeEquals(expectedHash, suppliedHash))
        {
            await using var increment = new SqlCommand(
                "UPDATE dbo.AuthOtpChallenge SET Attempts = Attempts + 1 WHERE ChallengeId = @id;",
                connection,
                transaction);
            increment.Parameters.AddWithValue("@id", challengeId);
            await increment.ExecuteNonQueryAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            throw new AuthValidationException("Mã OTP không hợp lệ hoặc đã hết hạn.");
        }

        await using var delete = new SqlCommand(
            "DELETE FROM dbo.AuthOtpChallenge WHERE ChallengeId = @id;",
            connection,
            transaction);
        delete.Parameters.AddWithValue("@id", challengeId);
        await delete.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task<string> CreateSessionAsync(
        SqlConnection connection,
        SqlTransaction transaction,
        string subject,
        CancellationToken cancellationToken)
    {
        var token = $"lv_{Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_')}";
        await using var command = new SqlCommand(
            "INSERT INTO dbo.AuthSession (GoogleSubject, TokenHash, ExpiresAt) VALUES (@subject, @hash, DATEADD(DAY, @days, SYSUTCDATETIME()));",
            connection,
            transaction);
        command.Parameters.AddWithValue("@subject", subject);
        command.Parameters.Add("@hash", SqlDbType.Binary, 32).Value = HashToken(token);
        command.Parameters.AddWithValue("@days", SessionLifetimeDays);
        await command.ExecuteNonQueryAsync(cancellationToken);
        return token;
    }

    private async Task<string> CreateSessionAsync(string subject, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        var token = $"lv_{Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_')}";
        await using var command = new SqlCommand(
            "INSERT INTO dbo.AuthSession (GoogleSubject, TokenHash, ExpiresAt) VALUES (@subject, @hash, DATEADD(DAY, @days, SYSUTCDATETIME()));",
            connection);
        command.Parameters.AddWithValue("@subject", subject);
        command.Parameters.Add("@hash", SqlDbType.Binary, 32).Value = HashToken(token);
        command.Parameters.AddWithValue("@days", SessionLifetimeDays);
        await command.ExecuteNonQueryAsync(cancellationToken);
        return token;
    }

    private async Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT COUNT(*) FROM dbo.LocalCredential WHERE NormalizedEmail = @email;",
            connection);
        command.Parameters.AddWithValue("@email", email);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken)) > 0;
    }

    private async Task<bool> IsEmailRegisteredAsync(string email, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "SELECT COUNT(*) FROM dbo.AppUser WHERE Email = @email;",
            connection);
        command.Parameters.AddWithValue("@email", email);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken)) > 0;
    }

    private async Task UpdatePasswordHashAsync(string subject, string hash, CancellationToken cancellationToken)
    {
        await using var connection = new SqlConnection(ConnectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(
            "UPDATE dbo.LocalCredential SET PasswordHash = @hash WHERE GoogleSubject = @subject;",
            connection);
        command.Parameters.AddWithValue("@hash", hash);
        command.Parameters.AddWithValue("@subject", subject);
        if (await command.ExecuteNonQueryAsync(cancellationToken) == 0)
        {
            throw new AuthValidationException("Tài khoản này chưa đăng ký mật khẩu.");
        }
    }

    private static string NormalizeEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 320)
        {
            throw new AuthValidationException("Email không hợp lệ.");
        }
        try
        {
            var value = email.Trim();
            var parsed = new MailAddress(value);
            if (!string.Equals(parsed.Address, value, StringComparison.OrdinalIgnoreCase))
            {
                throw new AuthValidationException("Email không hợp lệ.");
            }
            return parsed.Address.ToLowerInvariant();
        }
        catch (FormatException)
        {
            throw new AuthValidationException("Email không hợp lệ.");
        }
    }

    private static void ValidateCode(string code)
    {
        if (string.IsNullOrEmpty(code) || code.Length != 6 || !code.All(char.IsAsciiDigit))
        {
            throw new AuthValidationException("Mã OTP phải gồm 6 chữ số.");
        }
    }

    private static void ValidateUsername(string username)
    {
        if (string.IsNullOrWhiteSpace(username) || !UsernamePattern.IsMatch(username.Trim()))
        {
            throw new AuthValidationException("Username phải dài 3–32 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.");
        }
    }

    private static void ValidatePassword(string password)
    {
        if (string.IsNullOrEmpty(password) || password.Length is < 6 or > 128)
        {
            throw new AuthValidationException("Mật khẩu phải có từ 6 đến 128 ký tự.");
        }
    }

    private static (string Type, string Value) NormalizeRule(string type, string value)
    {
        if (string.IsNullOrWhiteSpace(type) || string.IsNullOrWhiteSpace(value))
        {
            throw new AuthValidationException("Loại quy tắc và giá trị không được để trống.");
        }
        var normalizedType = type.Trim().ToLowerInvariant();
        var normalizedValue = value.Trim().TrimStart('@').ToLowerInvariant();
        if (normalizedType == "email")
        {
            normalizedValue = NormalizeEmail(normalizedValue);
        }
        else if (normalizedType == "domain")
        {
            if (normalizedValue.Length is < 3 or > 253 ||
                !normalizedValue.Contains('.') ||
                normalizedValue.Any(character => !(char.IsAsciiLetterOrDigit(character) || character is '.' or '-')))
            {
                throw new AuthValidationException("Tên miền email không hợp lệ.");
            }
        }
        else
        {
            throw new AuthValidationException("Loại quy tắc phải là email hoặc domain.");
        }
        return (normalizedType, normalizedValue);
    }

    private byte[] HashOtpCode(string code, byte[] salt)
    {
        var pepper = configuration["Auth:OtpPepper"];
        if (string.IsNullOrWhiteSpace(pepper) || Encoding.UTF8.GetByteCount(pepper) < 32)
        {
            throw new AuthConfigurationException("Auth:OtpPepper cần được cấu hình thành một khóa bí mật có ít nhất 32 byte.");
        }
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(pepper));
        return hmac.ComputeHash(Encoding.UTF8.GetBytes($"{Convert.ToBase64String(salt)}:{code}"));
    }

    private static byte[] HashToken(string token) => SHA256.HashData(Encoding.UTF8.GetBytes(token));
}
