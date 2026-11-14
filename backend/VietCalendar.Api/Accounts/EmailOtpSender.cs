using System.Net;
using System.Net.Mail;
using System.Globalization;

namespace VietCalendar.Api.Accounts;

public sealed class EmailOtpSender(IConfiguration configuration)
{
    public async Task SendAsync(string email, string code, CancellationToken cancellationToken)
    {
        var host = configuration["Email:SmtpHost"]?.Trim();
        var sender = configuration["Email:From"]?.Trim();
        if (string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(sender) ||
            !int.TryParse(configuration["Email:SmtpPort"], NumberStyles.None, CultureInfo.InvariantCulture, out var port) ||
            port is < 1 or > 65535)
        {
            throw new AuthConfigurationException("Email OTP chưa được cấu hình đầy đủ trên máy chủ.");
        }

        MailAddress senderAddress;
        try
        {
            senderAddress = new MailAddress(sender);
        }
        catch (FormatException exception)
        {
            throw new AuthConfigurationException($"Email:From không hợp lệ: {exception.Message}");
        }

        var username = configuration["Email:Username"];
        var password = configuration["Email:Password"];
        if (string.IsNullOrWhiteSpace(username) != string.IsNullOrWhiteSpace(password))
        {
            throw new AuthConfigurationException("Email:Username và Email:Password phải được cấu hình cùng nhau.");
        }

        var enableSslValue = configuration["Email:EnableSsl"];
        if (!string.IsNullOrWhiteSpace(enableSslValue) &&
            !bool.TryParse(enableSslValue, out _))
        {
            throw new AuthConfigurationException("Email:EnableSsl phải là true hoặc false.");
        }

        using var message = new MailMessage(senderAddress, new MailAddress(email))
        {
            Subject = "Mã xác minh Lịch Việt",
            Body = $"Mã xác minh của bạn là {code}. Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.",
            IsBodyHtml = false,
        };
        using var client = new SmtpClient(host, port)
        {
            EnableSsl = string.IsNullOrWhiteSpace(enableSslValue) || bool.Parse(enableSslValue),
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Timeout = 15000,
        };
        if (!string.IsNullOrWhiteSpace(username))
        {
            client.Credentials = new NetworkCredential(username, password);
        }

        await client.SendMailAsync(message, cancellationToken);
    }
}
