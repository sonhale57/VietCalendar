SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID(N'dbo.AppUser', N'U') IS NULL
BEGIN
    RAISERROR(N'dbo.AppUser must exist before applying calendar event changes.', 16, 1);
    RETURN;
END;

IF OBJECT_ID(N'dbo.CalendarEvent', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CalendarEvent
    (
        CalendarEventId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_CalendarEvent PRIMARY KEY,
        OwnerSubject NVARCHAR(255) NOT NULL,
        Title NVARCHAR(120) NOT NULL,
        Description NVARCHAR(2000) NULL,
        EventKind VARCHAR(8) NOT NULL,
        CalendarType VARCHAR(6) NOT NULL,
        EventYear SMALLINT NOT NULL,
        EventMonth TINYINT NOT NULL,
        EventDay TINYINT NOT NULL,
        Recurrence VARCHAR(8) NOT NULL,
        Label NVARCHAR(32) NULL,
        IsCountdown BIT NOT NULL CONSTRAINT DF_CalendarEvent_IsCountdown DEFAULT (0),
        SourceEventId UNIQUEIDENTIFIER NULL,
        SourceOwnerSubject NVARCHAR(255) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CalendarEvent_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CalendarEvent_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_CalendarEvent_AppUser FOREIGN KEY (OwnerSubject)
            REFERENCES dbo.AppUser (GoogleSubject),
        CONSTRAINT CK_CalendarEvent_EventKind CHECK (EventKind IN ('event', 'reminder')),
        CONSTRAINT CK_CalendarEvent_CalendarType CHECK (CalendarType IN ('solar', 'lunar')),
        CONSTRAINT CK_CalendarEvent_Recurrence CHECK (Recurrence IN ('once', 'yearly')),
        CONSTRAINT CK_CalendarEvent_Year CHECK (EventYear BETWEEN 1900 AND 2100),
        CONSTRAINT CK_CalendarEvent_Month CHECK (EventMonth BETWEEN 1 AND 12),
        CONSTRAINT CK_CalendarEvent_Day CHECK (EventDay BETWEEN 1 AND 30),
        CONSTRAINT CK_CalendarEvent_Source CHECK (
            (SourceEventId IS NULL AND SourceOwnerSubject IS NULL) OR
            (SourceEventId IS NOT NULL AND SourceOwnerSubject IS NOT NULL))
    );

    CREATE INDEX IX_CalendarEvent_OwnerDate
        ON dbo.CalendarEvent (OwnerSubject, EventYear, EventMonth, EventDay);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_CalendarEvent_ImportedSource'
      AND object_id = OBJECT_ID(N'dbo.CalendarEvent'))
BEGIN
    CREATE UNIQUE INDEX UX_CalendarEvent_ImportedSource
        ON dbo.CalendarEvent (OwnerSubject, SourceOwnerSubject, SourceEventId)
        WHERE SourceEventId IS NOT NULL;
END;

IF OBJECT_ID(N'dbo.CalendarEventShare', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CalendarEventShare
    (
        ShareId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_CalendarEventShare PRIMARY KEY,
        CalendarEventId UNIQUEIDENTIFIER NOT NULL,
        ShareTokenHash BINARY(32) NOT NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CalendarEventShare_CreatedAt DEFAULT (SYSUTCDATETIME()),
        RevokedAt DATETIME2(0) NULL,
        CONSTRAINT FK_CalendarEventShare_CalendarEvent FOREIGN KEY (CalendarEventId)
            REFERENCES dbo.CalendarEvent (CalendarEventId) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX UX_CalendarEventShare_TokenHash
        ON dbo.CalendarEventShare (ShareTokenHash);
    CREATE INDEX IX_CalendarEventShare_Event
        ON dbo.CalendarEventShare (CalendarEventId, RevokedAt);
END;
