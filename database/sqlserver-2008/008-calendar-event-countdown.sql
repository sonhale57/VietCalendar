IF OBJECT_ID(N'dbo.CalendarEvent', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.CalendarEvent', N'IsCountdown') IS NULL
BEGIN
    ALTER TABLE dbo.CalendarEvent
        ADD IsCountdown BIT NOT NULL
            CONSTRAINT DF_CalendarEvent_IsCountdown DEFAULT (0) WITH VALUES;
END;
