IF OBJECT_ID(N'dbo.AppUser', N'U') IS NULL
BEGIN
    RAISERROR(N'dbo.AppUser must exist before applying email/password authentication.', 16, 1);
    RETURN;
END;

IF OBJECT_ID(N'dbo.LocalCredential', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LocalCredential
    (
        GoogleSubject NVARCHAR(255) NOT NULL CONSTRAINT PK_LocalCredential PRIMARY KEY,
        NormalizedEmail NVARCHAR(320) NOT NULL,
        NormalizedUsername NVARCHAR(32) NOT NULL,
        PasswordHash NVARCHAR(512) NOT NULL,
        EmailVerified BIT NOT NULL CONSTRAINT DF_LocalCredential_EmailVerified DEFAULT (0),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_LocalCredential_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_LocalCredential_AppUser FOREIGN KEY (GoogleSubject)
            REFERENCES dbo.AppUser (GoogleSubject)
    );

    CREATE UNIQUE INDEX UX_LocalCredential_Email ON dbo.LocalCredential (NormalizedEmail);
    CREATE UNIQUE INDEX UX_LocalCredential_Username ON dbo.LocalCredential (NormalizedUsername);
END;

IF OBJECT_ID(N'dbo.AuthOtpChallenge', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuthOtpChallenge
    (
        ChallengeId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuthOtpChallenge PRIMARY KEY,
        NormalizedEmail NVARCHAR(320) NOT NULL,
        Purpose VARCHAR(16) NOT NULL,
        CodeSalt BINARY(16) NOT NULL,
        CodeHash BINARY(32) NOT NULL,
        ExpiresAt DATETIME2(0) NOT NULL,
        Attempts INT NOT NULL CONSTRAINT DF_AuthOtpChallenge_Attempts DEFAULT (0),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AuthOtpChallenge_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT CK_AuthOtpChallenge_Purpose CHECK (Purpose IN ('register', 'reset'))
    );

    CREATE UNIQUE INDEX UX_AuthOtpChallenge_EmailPurpose
        ON dbo.AuthOtpChallenge (NormalizedEmail, Purpose);
END;

IF OBJECT_ID(N'dbo.AuthSession', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuthSession
    (
        TokenHash BINARY(32) NOT NULL CONSTRAINT PK_AuthSession PRIMARY KEY,
        GoogleSubject NVARCHAR(255) NOT NULL,
        ExpiresAt DATETIME2(0) NOT NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AuthSession_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_AuthSession_AppUser FOREIGN KEY (GoogleSubject)
            REFERENCES dbo.AppUser (GoogleSubject)
    );

    CREATE INDEX IX_AuthSession_Subject ON dbo.AuthSession (GoogleSubject);
END;

IF OBJECT_ID(N'dbo.EmailRegistrationRule', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmailRegistrationRule
    (
        RuleId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_EmailRegistrationRule PRIMARY KEY,
        RuleType VARCHAR(8) NOT NULL,
        RuleValue NVARCHAR(320) NOT NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_EmailRegistrationRule_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT CK_EmailRegistrationRule_Type CHECK (RuleType IN ('email', 'domain'))
    );

    CREATE UNIQUE INDEX UX_EmailRegistrationRule_TypeValue
        ON dbo.EmailRegistrationRule (RuleType, RuleValue);
END;
