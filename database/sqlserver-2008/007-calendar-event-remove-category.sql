IF OBJECT_ID(N'dbo.CalendarEvent', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.CalendarEvent', N'Category') IS NOT NULL
BEGIN
    ALTER TABLE dbo.CalendarEvent DROP COLUMN Category;
END;
