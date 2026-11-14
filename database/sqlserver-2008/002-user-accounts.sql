IF OBJECT_ID(N'dbo.AppUser', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AppUser
    (
        GoogleSubject NVARCHAR(255) NOT NULL CONSTRAINT PK_AppUser PRIMARY KEY,
        Email NVARCHAR(320) NOT NULL,
        DisplayName NVARCHAR(200) NOT NULL,
        PictureUrl NVARCHAR(2048) NULL,
        SettingsJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AppUser_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AppUser_UpdatedAt DEFAULT (SYSUTCDATETIME())
    );

    CREATE INDEX IX_AppUser_Email ON dbo.AppUser (Email);
END;
