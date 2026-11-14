IF OBJECT_ID(N'dbo.CalendarContent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CalendarContent
    (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CalendarContent PRIMARY KEY,
        SolarMonth TINYINT NOT NULL,
        SolarDay TINYINT NOT NULL,
        LunarMonth TINYINT NULL,
        LunarDay TINYINT NULL,
        Title NVARCHAR(200) NOT NULL,
        Body NVARCHAR(2000) NULL,
        Category NVARCHAR(40) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_CalendarContent_IsActive DEFAULT (1),
        CONSTRAINT CK_CalendarContent_SolarMonth CHECK (SolarMonth BETWEEN 1 AND 12),
        CONSTRAINT CK_CalendarContent_SolarDay CHECK (SolarDay BETWEEN 1 AND 31),
        CONSTRAINT CK_CalendarContent_LunarMonth CHECK (LunarMonth IS NULL OR LunarMonth BETWEEN 1 AND 12),
        CONSTRAINT CK_CalendarContent_LunarDay CHECK (LunarDay IS NULL OR LunarDay BETWEEN 1 AND 30)
    );

    CREATE INDEX IX_CalendarContent_Month_Active
        ON dbo.CalendarContent (SolarMonth, IsActive, SolarDay);
END;
