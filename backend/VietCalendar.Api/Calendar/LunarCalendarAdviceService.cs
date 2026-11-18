namespace VietCalendar.Api.Calendar;

public interface ILunarCalendarAdviceService
{
    Task<string?> GetDocumentJsonAsync(CancellationToken cancellationToken);
}

public sealed class LunarCalendarAdviceService : ILunarCalendarAdviceService
{
    private readonly string connectionString;
    private readonly LunarCalendarAdviceRepository repository;

    public LunarCalendarAdviceService(
        IConfiguration configuration,
        LunarCalendarAdviceRepository repository)
    {
        connectionString = configuration.GetConnectionString("CalendarDb")
            ?? throw new InvalidOperationException("ConnectionStrings:CalendarDb must be configured.");
        this.repository = repository;
    }

    public Task<string?> GetDocumentJsonAsync(CancellationToken cancellationToken) =>
        repository.GetDocumentJsonAsync(connectionString, cancellationToken);
}
