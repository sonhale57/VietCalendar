IF OBJECT_ID(N'dbo.AppUser', N'U') IS NULL
BEGIN
    RAISERROR(N'dbo.AppUser must exist before applying the Google Calendar migration.', 16, 1);
    RETURN;
END;

IF COL_LENGTH(N'dbo.AppUser', N'CalendarRefreshToken') IS NULL
BEGIN
    ALTER TABLE dbo.AppUser ADD CalendarRefreshToken NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH(N'dbo.AppUser', N'CalendarClientId') IS NULL
BEGIN
    ALTER TABLE dbo.AppUser ADD CalendarClientId NVARCHAR(512) NULL;
END;
