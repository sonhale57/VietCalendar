using Microsoft.Extensions.Configuration;
using VietCalendar.Api.Accounts;

namespace VietCalendar.Api.Tests;

public sealed class EmailOtpSenderTests
{
    [Fact]
    public void Configuration_MapsDoubleUnderscoreEnvironmentVariablesToEmailSettings()
    {
        const string variable = "Email__SmtpHost";
        var previousValue = Environment.GetEnvironmentVariable(variable);
        try
        {
            Environment.SetEnvironmentVariable(variable, "smtp.example.com");
            var configuration = new ConfigurationBuilder().AddEnvironmentVariables().Build();

            Assert.Equal("smtp.example.com", configuration["Email:SmtpHost"]);
        }
        finally
        {
            Environment.SetEnvironmentVariable(variable, previousValue);
        }
    }

    [Fact]
    public async Task SendAsync_ThrowsConfigurationErrorWhenSmtpSettingsAreMissing()
    {
        var sender = new EmailOtpSender(new ConfigurationBuilder().Build());

        var exception = await Assert.ThrowsAsync<AuthConfigurationException>(
            () => sender.SendAsync("user@example.com", "123456", CancellationToken.None));

        Assert.Contains("Email OTP", exception.Message);
    }

    [Fact]
    public async Task SendAsync_RejectsCredentialsWhenUsernameAndPasswordAreNotPaired()
    {
        var sender = CreateSender(new Dictionary<string, string?>
        {
            ["Email:SmtpHost"] = "smtp.example.com",
            ["Email:SmtpPort"] = "587",
            ["Email:From"] = "noreply@example.com",
            ["Email:Username"] = "mailer",
        });

        var exception = await Assert.ThrowsAsync<AuthConfigurationException>(
            () => sender.SendAsync("user@example.com", "123456", CancellationToken.None));

        Assert.Contains("Username", exception.Message);
    }

    [Fact]
    public async Task SendAsync_RejectsInvalidEnableSslSetting()
    {
        var sender = CreateSender(new Dictionary<string, string?>
        {
            ["Email:SmtpHost"] = "smtp.example.com",
            ["Email:SmtpPort"] = "587",
            ["Email:From"] = "noreply@example.com",
            ["Email:EnableSsl"] = "sometimes",
        });

        var exception = await Assert.ThrowsAsync<AuthConfigurationException>(
            () => sender.SendAsync("user@example.com", "123456", CancellationToken.None));

        Assert.Contains("EnableSsl", exception.Message);
    }

    private static EmailOtpSender CreateSender(IDictionary<string, string?> settings) =>
        new(new ConfigurationBuilder().AddInMemoryCollection(settings).Build());
}
