using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Http.HttpResults;

namespace VietCalendar.Api.Calendar;

public static class LunarCalendarAdviceEndpoints
{
    public static void MapLunarCalendarAdviceEndpoints(this WebApplication app)
    {
        app.MapGet("/api/v1/content/lunar-advice", async Task<Results<ContentHttpResult, ProblemHttpResult>> (
            ILunarCalendarAdviceService adviceService,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var json = await adviceService.GetDocumentJsonAsync(cancellationToken);
                if (json is null)
                {
                    logger.LogError("Lunar calendar advice has not been seeded in the database.");
                    return TypedResults.Problem(
                        statusCode: StatusCodes.Status503ServiceUnavailable,
                        title: "Lunar calendar advice is temporarily unavailable.");
                }

                return TypedResults.Content(json, "application/json; charset=utf-8");
            }
            catch (SqlException exception)
            {
                logger.LogError(exception, "Could not read lunar calendar advice.");
                return TypedResults.Problem(
                    statusCode: StatusCodes.Status503ServiceUnavailable,
                    title: "Lunar calendar advice is temporarily unavailable.");
            }
        })
            .WithName("GetLunarCalendarAdvice")
            .WithSummary("Get Thập Trai and Thọ Khang advice for the lunar calendar")
            .WithDescription("Returns the complete advice document seeded from json_12_thang_am_lich.json.")
            .Produces(StatusCodes.Status200OK, contentType: "application/json")
            .Produces(StatusCodes.Status503ServiceUnavailable);
    }
}
