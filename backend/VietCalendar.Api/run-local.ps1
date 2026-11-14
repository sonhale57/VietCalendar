$ErrorActionPreference = "Stop"

$configurationFile = Join-Path $PSScriptRoot "appsettings.Production.json"
if (-not (Test-Path -LiteralPath $configurationFile -PathType Leaf)) {
    throw "Missing $configurationFile. Configure the API in appsettings.Production.json."
}

$configuration = Get-Content -LiteralPath $configurationFile -Raw | ConvertFrom-Json
$email = $configuration.Email
$smtpPort = 0
$sslSetting = [string]$email.EnableSsl
$otpPepperBytes = [Text.Encoding]::UTF8.GetByteCount([string]$configuration.Auth.OtpPepper)

if ([string]::IsNullOrWhiteSpace([string]$configuration.ConnectionStrings.CalendarDb)) {
    throw "ConnectionStrings:CalendarDb is missing from appsettings.Production.json."
}
if ([string]::IsNullOrWhiteSpace([string]$email.SmtpHost) -or
    -not [int]::TryParse([string]$email.SmtpPort, [ref]$smtpPort) -or
    $smtpPort -lt 1 -or $smtpPort -gt 65535 -or
    [string]::IsNullOrWhiteSpace([string]$email.From) -or
    $sslSetting -notmatch '^(?i:true|false)$') {
    throw "Email SMTP settings are incomplete in appsettings.Production.json."
}
if ([string]::IsNullOrWhiteSpace([string]$email.Username) -ne
    [string]::IsNullOrWhiteSpace([string]$email.Password)) {
    throw "Email:Username and Email:Password must be configured together."
}
if ($otpPepperBytes -lt 32) {
    throw "Auth:OtpPepper must be a stable secret of at least 32 bytes."
}

$env:ASPNETCORE_ENVIRONMENT = "Production"
dotnet run --no-launch-profile --project "$PSScriptRoot\VietCalendar.Api.csproj" -- --urls http://0.0.0.0:5062
