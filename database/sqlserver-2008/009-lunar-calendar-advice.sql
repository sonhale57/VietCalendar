IF OBJECT_ID(N'dbo.LunarCalendarAdvice', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LunarCalendarAdvice
    (
        Id TINYINT NOT NULL CONSTRAINT PK_LunarCalendarAdvice PRIMARY KEY,
        DataVersion NVARCHAR(32) NOT NULL,
        ContentHash VARBINARY(32) NOT NULL,
        JsonData NVARCHAR(MAX) NOT NULL,
        UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_LunarCalendarAdvice_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT CK_LunarCalendarAdvice_Singleton CHECK (Id = 1)
    );
END;
