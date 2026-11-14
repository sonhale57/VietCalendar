IF OBJECT_ID(N'dbo.AuthOtpChallenge', N'U') IS NULL
BEGIN
    RAISERROR(N'dbo.AuthOtpChallenge must exist before applying email verification changes.', 16, 1);
    RETURN;
END;

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_AuthOtpChallenge_Purpose'
      AND parent_object_id = OBJECT_ID(N'dbo.AuthOtpChallenge'))
BEGIN
    ALTER TABLE dbo.AuthOtpChallenge DROP CONSTRAINT CK_AuthOtpChallenge_Purpose;
END;

ALTER TABLE dbo.AuthOtpChallenge
    ADD CONSTRAINT CK_AuthOtpChallenge_Purpose
    CHECK (Purpose IN ('register', 'reset', 'verify'));
