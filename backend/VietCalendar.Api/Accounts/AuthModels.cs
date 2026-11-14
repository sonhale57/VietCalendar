namespace VietCalendar.Api.Accounts;

public sealed record EmailRequest(string Email);

public sealed record EmailRegistrationRequest(string Email, string Username, string Password, string? Code = null);

public sealed record EmailLoginRequest(string UsernameOrEmail, string Password);

public sealed record EmailVerificationRequest(string Code);

public sealed record PasswordResetRequest(string Email, string Code, string NewPassword);

public sealed record PasswordChangeRequest(string CurrentPassword, string NewPassword);

public sealed record EmailAllowlistRule(int Id, string Type, string Value);

public sealed record EmailAllowlistRuleRequest(string Type, string Value);

public sealed record AuthSessionResponse(
    string AccessToken,
    GoogleAccount User,
    CalendarUserSettings? Settings,
    bool IsAdmin,
    bool HasPassword = false,
    bool EmailVerified = true);

public sealed class AuthConfigurationException(string message) : Exception(message);

public sealed class AuthConflictException(string message) : Exception(message);

public sealed class AuthValidationException(string message) : Exception(message);
