using System.Security.Cryptography;
using System.Text;
using Google.Apis.Auth;

namespace VietCalendar.Api.Accounts;

public sealed class AccountAuthenticator(
    IConfiguration configuration,
    GoogleTokenValidator googleTokenValidator,
    LocalAccountService localAccounts)
{
    public async Task<GoogleAccount> AuthenticateAsync(string token, CancellationToken cancellationToken)
    {
        if (token.StartsWith("lv_", StringComparison.Ordinal))
        {
            return await localAccounts.GetSessionUserAsync(token, cancellationToken)
                ?? throw new InvalidJwtException("The account session is invalid or expired.");
        }

        return await googleTokenValidator.ValidateAsync(token, cancellationToken);
    }

    public bool IsAdmin(string email)
    {
        var admins = configuration.GetSection("Auth:AdminEmails").Get<string[]>() ?? [];
        return admins.Any(admin => string.Equals(
            admin.Trim(),
            email,
            StringComparison.OrdinalIgnoreCase));
    }
}
