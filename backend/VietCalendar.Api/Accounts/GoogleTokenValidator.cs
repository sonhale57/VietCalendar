using Google.Apis.Auth;

namespace VietCalendar.Api.Accounts;

public sealed class GoogleTokenValidator(IConfiguration configuration)
{
    public async Task<GoogleAccount> ValidateAsync(string idToken, CancellationToken cancellationToken)
    {
        var audiences = configuration.GetSection("GoogleAuth:Audiences").Get<string[]>()?
            .Where(audience => !string.IsNullOrWhiteSpace(audience))
            .ToArray() ?? [];
        if (audiences.Length == 0)
        {
            throw new InvalidOperationException("Google OAuth audiences are not configured.");
        }

        var payload = await GoogleJsonWebSignature.ValidateAsync(
            idToken,
            new GoogleJsonWebSignature.ValidationSettings { Audience = audiences });
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(payload.Subject) ||
            string.IsNullOrWhiteSpace(payload.Email) ||
            payload.EmailVerified != true)
        {
            throw new InvalidJwtException("Google token does not contain a verified account.");
        }

        return new GoogleAccount(
            payload.Subject,
            payload.Email,
            string.IsNullOrWhiteSpace(payload.Name) ? payload.Email : payload.Name,
            payload.Picture);
    }
}
