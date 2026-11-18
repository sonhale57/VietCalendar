using System.Security.Cryptography;
using Google.Apis.Auth;
using Microsoft.Data.SqlClient;
using VietCalendar.Api.Accounts;

namespace VietCalendar.Api.Calendar;

public static class CalendarEventEndpoints
{
    public static void MapCalendarEventEndpoints(this WebApplication app)
    {
        var events = app.MapGroup("/api/v1/calendar/events");

        events.MapGet("/", async Task<IResult> (
            HttpContext context,
            AccountAuthenticator authenticator,
            ICalendarEventService service,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var authentication = await AuthenticateAsync(context, authenticator, logger, cancellationToken);
            if (authentication.Error is not null) return authentication.Error;

            try
            {
                return Results.Ok(await service.GetEventsAsync(authentication.User!.Subject, cancellationToken));
            }
            catch (SqlException exception) { return HandleSqlException(exception, logger); }
            catch (InvalidOperationException exception)
            {
                logger.LogError(exception, "Calendar event database is not configured.");
                return StorageUnavailable();
            }
        })
            .WithName("GetCalendarEvents")
            .WithSummary("List calendar events")
            .WithDescription("Returns all events and reminders owned by the authenticated account.")
            .Produces<IReadOnlyList<CalendarEventResponse>>()
            .Produces(StatusCodes.Status401Unauthorized);

        events.MapGet("/{id:guid}", async Task<IResult> (
            Guid id,
            HttpContext context,
            AccountAuthenticator authenticator,
            ICalendarEventService service,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var authentication = await AuthenticateAsync(context, authenticator, logger, cancellationToken);
            if (authentication.Error is not null) return authentication.Error;

            try
            {
                var calendarEvent = await service.GetEventAsync(authentication.User!.Subject, id, cancellationToken);
                return calendarEvent is null ? Results.NotFound() : Results.Ok(calendarEvent);
            }
            catch (SqlException exception) { return HandleSqlException(exception, logger); }
            catch (InvalidOperationException exception)
            {
                logger.LogError(exception, "Calendar event database is not configured.");
                return StorageUnavailable();
            }
        })
            .WithName("GetCalendarEvent")
            .WithSummary("Get a calendar event")
            .Produces<CalendarEventResponse>()
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        events.MapPost("/", async Task<IResult> (
            CreateCalendarEventRequest request,
            HttpContext context,
            AccountAuthenticator authenticator,
            ICalendarEventService service,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var authentication = await AuthenticateAsync(context, authenticator, logger, cancellationToken);
            if (authentication.Error is not null) return authentication.Error;

            try
            {
                var created = await service.CreateEventAsync(authentication.User!.Subject, request, cancellationToken);
                return Results.Created($"/api/v1/calendar/events/{created.Id}", created);
            }
            catch (CalendarEventValidationException exception) { return ValidationError(exception.Message); }
            catch (SqlException exception) { return HandleSqlException(exception, logger); }
            catch (InvalidOperationException exception)
            {
                logger.LogError(exception, "Calendar event database is not configured.");
                return StorageUnavailable();
            }
        })
            .WithName("CreateCalendarEvent")
            .WithSummary("Create an event or reminder")
            .Produces<CalendarEventResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status401Unauthorized);

        events.MapPut("/{id:guid}", async Task<IResult> (
            Guid id,
            UpdateCalendarEventRequest request,
            HttpContext context,
            AccountAuthenticator authenticator,
            ICalendarEventService service,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var authentication = await AuthenticateAsync(context, authenticator, logger, cancellationToken);
            if (authentication.Error is not null) return authentication.Error;

            try
            {
                var updated = await service.UpdateEventAsync(authentication.User!.Subject, id, request, cancellationToken);
                return updated is null ? Results.NotFound() : Results.Ok(updated);
            }
            catch (CalendarEventValidationException exception) { return ValidationError(exception.Message); }
            catch (SqlException exception) { return HandleSqlException(exception, logger); }
            catch (InvalidOperationException exception)
            {
                logger.LogError(exception, "Calendar event database is not configured.");
                return StorageUnavailable();
            }
        })
            .WithName("UpdateCalendarEvent")
            .WithSummary("Update an event or reminder")
            .WithDescription("Optionally applies the update to copies already added by other users.")
            .Produces<CalendarEventResponse>()
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        events.MapDelete("/{id:guid}", async Task<IResult> (
            Guid id,
            HttpContext context,
            AccountAuthenticator authenticator,
            ICalendarEventService service,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var authentication = await AuthenticateAsync(context, authenticator, logger, cancellationToken);
            if (authentication.Error is not null) return authentication.Error;

            try
            {
                return await service.DeleteEventAsync(authentication.User!.Subject, id, cancellationToken)
                    ? Results.NoContent()
                    : Results.NotFound();
            }
            catch (SqlException exception) { return HandleSqlException(exception, logger); }
            catch (InvalidOperationException exception)
            {
                logger.LogError(exception, "Calendar event database is not configured.");
                return StorageUnavailable();
            }
        })
            .WithName("DeleteCalendarEvent")
            .WithSummary("Delete an event or reminder")
            .WithDescription("Removes the owner's event and invalidates its share links. Imported copies remain in recipients' calendars.")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        events.MapPost("/{id:guid}/share-link", async Task<IResult> (
            Guid id,
            HttpContext context,
            AccountAuthenticator authenticator,
            ICalendarEventService service,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var authentication = await AuthenticateAsync(context, authenticator, logger, cancellationToken);
            if (authentication.Error is not null) return authentication.Error;

            try
            {
                var token = await service.CreateShareLinkAsync(authentication.User!.Subject, id, cancellationToken);
                return token is null
                    ? Results.NotFound()
                    : Results.Ok(new CalendarEventShareLinkResponse(token));
            }
            catch (SqlException exception) { return HandleSqlException(exception, logger); }
            catch (InvalidOperationException exception)
            {
                logger.LogError(exception, "Calendar event database is not configured.");
                return StorageUnavailable();
            }
        })
            .WithName("CreateCalendarEventShareLink")
            .WithSummary("Create a share link for an event")
            .Produces<CalendarEventShareLinkResponse>()
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        events.MapPost("/{id:guid}/invite", async Task<IResult> (
            Guid id,
            CalendarEventInviteRequest request,
            HttpContext context,
            AccountAuthenticator authenticator,
            ICalendarEventService service,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var authentication = await AuthenticateAsync(context, authenticator, logger, cancellationToken);
            if (authentication.Error is not null) return authentication.Error;

            try
            {
                var invited = await service.InviteUserAsync(
                    authentication.User!.Subject,
                    id,
                    request.Identifier,
                    cancellationToken);
                return invited is null ? Results.NotFound() : Results.Ok(invited);
            }
            catch (CalendarEventValidationException exception) { return ValidationError(exception.Message); }
            catch (CalendarEventConflictException exception) { return Results.Conflict(new { detail = exception.Message }); }
            catch (SqlException exception) { return HandleSqlException(exception, logger); }
            catch (InvalidOperationException exception)
            {
                logger.LogError(exception, "Calendar event database is not configured.");
                return StorageUnavailable();
            }
        })
            .WithName("InviteCalendarEventUser")
            .WithSummary("Add an event to a registered user's calendar")
            .WithDescription("The recipient is identified by the registered email or username. No email invitation is sent.")
            .Produces<CalendarEventResponse>()
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status401Unauthorized);

        app.MapGet("/api/v1/shared-events/{token}", async Task<IResult> (
            string token,
            ICalendarEventService service,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var shared = await service.GetSharedEventAsync(token, cancellationToken);
                return shared is null ? Results.NotFound() : Results.Ok(shared);
            }
            catch (SqlException exception) { return HandleSqlException(exception, logger); }
            catch (InvalidOperationException exception)
            {
                logger.LogError(exception, "Calendar event database is not configured.");
                return StorageUnavailable();
            }
        })
            .WithName("GetSharedCalendarEvent")
            .WithSummary("Preview an event using a share link")
            .Produces<SharedCalendarEventResponse>()
            .Produces(StatusCodes.Status404NotFound);

        app.MapPost("/api/v1/shared-events/{token}/import", async Task<IResult> (
            string token,
            HttpContext context,
            AccountAuthenticator authenticator,
            ICalendarEventService service,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var authentication = await AuthenticateAsync(context, authenticator, logger, cancellationToken);
            if (authentication.Error is not null) return authentication.Error;

            try
            {
                var imported = await service.ImportSharedEventAsync(authentication.User!.Subject, token, cancellationToken);
                return imported is null
                    ? Results.NotFound()
                    : Results.Ok(imported);
            }
            catch (CalendarEventConflictException exception) { return Results.Conflict(new { detail = exception.Message }); }
            catch (SqlException exception) { return HandleSqlException(exception, logger); }
            catch (InvalidOperationException exception)
            {
                logger.LogError(exception, "Calendar event database is not configured.");
                return StorageUnavailable();
            }
        })
            .WithName("ImportSharedCalendarEvent")
            .WithSummary("Add a shared event to the authenticated calendar")
            .Produces<CalendarEventImportResponse>()
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status401Unauthorized);
    }

    private static async Task<AuthenticationResult> AuthenticateAsync(
        HttpContext context,
        AccountAuthenticator authenticator,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var authorization = context.Request.Headers.Authorization.ToString();
        if (!authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return new AuthenticationResult(null, Results.Unauthorized());
        }

        var token = authorization["Bearer ".Length..].Trim();
        if (token.Length == 0)
        {
            return new AuthenticationResult(null, Results.Unauthorized());
        }

        try
        {
            var user = await authenticator.AuthenticateAsync(token, cancellationToken);
            return new AuthenticationResult(user, null);
        }
        catch (InvalidJwtException)
        {
            return new AuthenticationResult(null, Results.Unauthorized());
        }
        catch (InvalidOperationException exception)
        {
            logger.LogError(exception, "Calendar event authentication is not configured.");
            return new AuthenticationResult(
                null,
                Results.Problem(
                    statusCode: StatusCodes.Status503ServiceUnavailable,
                    title: "Authentication is not configured."));
        }
        catch (HttpRequestException exception)
        {
            logger.LogError(exception, "Calendar event authentication service is unavailable.");
            return new AuthenticationResult(
                null,
                Results.Problem(
                    statusCode: StatusCodes.Status503ServiceUnavailable,
                    title: "Authentication is temporarily unavailable."));
        }
    }

    private static IResult ValidationError(string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { ["event"] = [message] });

    private static IResult StorageUnavailable() =>
        Results.Problem(
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Calendar event storage is temporarily unavailable.");

    private static IResult HandleSqlException(SqlException exception, ILogger logger)
    {
        if (exception.Number is 2601 or 2627)
        {
            return Results.Conflict(new { detail = "This event already exists in the calendar." });
        }

        logger.LogError(exception, "Calendar event database operation failed.");
        return StorageUnavailable();
    }

    private sealed record AuthenticationResult(GoogleAccount? User, IResult? Error);
}
