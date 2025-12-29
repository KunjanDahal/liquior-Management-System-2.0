-- ============================================
-- Professional Authentication System Schema
-- For Liquor Store Management System
-- ============================================

-- Users Table (Application-level user accounts)
-- This is separate from SQL Server authentication
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Users] (
        [UserID] INT IDENTITY(1,1) PRIMARY KEY,
        [Username] NVARCHAR(50) NOT NULL UNIQUE,
        [Email] NVARCHAR(100) NULL,
        [PasswordHash] NVARCHAR(255) NOT NULL,
        [FirstName] NVARCHAR(50) NOT NULL,
        [LastName] NVARCHAR(50) NOT NULL,
        [RoleID] INT NOT NULL DEFAULT 2, -- Default to Cashier role
        [IsActive] BIT NOT NULL DEFAULT 1,
        [MustChangePassword] BIT NOT NULL DEFAULT 0,
        [PasswordChangedAt] DATETIME NULL,
        [LastLoginAt] DATETIME NULL,
        [FailedLoginAttempts] INT NOT NULL DEFAULT 0,
        [LockedUntil] DATETIME NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [CreatedBy] INT NULL,
        [UpdatedBy] INT NULL,
        
        CONSTRAINT [FK_Users_Roles] FOREIGN KEY ([RoleID]) REFERENCES [dbo].[Roles]([RoleID]),
        CONSTRAINT [FK_Users_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[Users]([UserID]),
        CONSTRAINT [FK_Users_UpdatedBy] FOREIGN KEY ([UpdatedBy]) REFERENCES [dbo].[Users]([UserID])
    );
    
    CREATE INDEX [IX_Users_Username] ON [dbo].[Users]([Username]);
    CREATE INDEX [IX_Users_Email] ON [dbo].[Users]([Email]);
    CREATE INDEX [IX_Users_RoleID] ON [dbo].[Users]([RoleID]);
    CREATE INDEX [IX_Users_IsActive] ON [dbo].[Users]([IsActive]);
END
GO

-- Roles Table (Role-Based Access Control)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Roles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Roles] (
        [RoleID] INT IDENTITY(1,1) PRIMARY KEY,
        [RoleName] NVARCHAR(50) NOT NULL UNIQUE,
        [Description] NVARCHAR(255) NULL,
        [Permissions] NVARCHAR(MAX) NULL, -- JSON string of permissions
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [UpdatedAt] DATETIME NOT NULL DEFAULT GETDATE()
    );
    
    -- Insert default roles
    INSERT INTO [dbo].[Roles] ([RoleName], [Description], [Permissions])
    VALUES 
        ('Administrator', 'Full system access', '{"*":"*"}'),
        ('Manager', 'Store management access', '{"inventory":"*","sales":"*","reports":"*","customers":"*"}'),
        ('Cashier', 'Point of sale access', '{"sales":"create,read","customers":"read"}'),
        ('Inventory', 'Inventory management only', '{"inventory":"*"}');
END
GO

-- UserSessions Table (JWT token tracking)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserSessions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserSessions] (
        [SessionID] INT IDENTITY(1,1) PRIMARY KEY,
        [UserID] INT NOT NULL,
        [Token] NVARCHAR(500) NOT NULL UNIQUE,
        [RefreshToken] NVARCHAR(500) NULL,
        [IPAddress] NVARCHAR(45) NULL,
        [UserAgent] NVARCHAR(500) NULL,
        [ExpiresAt] DATETIME NOT NULL,
        [RefreshExpiresAt] DATETIME NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [LastActivityAt] DATETIME NOT NULL DEFAULT GETDATE(),
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT [FK_UserSessions_Users] FOREIGN KEY ([UserID]) REFERENCES [dbo].[Users]([UserID]) ON DELETE CASCADE
    );
    
    CREATE INDEX [IX_UserSessions_UserID] ON [dbo].[UserSessions]([UserID]);
    CREATE INDEX [IX_UserSessions_Token] ON [dbo].[UserSessions]([Token]);
    CREATE INDEX [IX_UserSessions_ExpiresAt] ON [dbo].[UserSessions]([ExpiresAt]);
    CREATE INDEX [IX_UserSessions_IsActive] ON [dbo].[UserSessions]([IsActive]);
END
GO

-- AuditLog Table (Security and activity logging)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AuditLog]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AuditLog] (
        [AuditLogID] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [UserID] INT NULL,
        [Action] NVARCHAR(50) NOT NULL, -- 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'PASSWORD_CHANGE', etc.
        [EntityType] NVARCHAR(50) NULL, -- 'User', 'Product', 'Receipt', etc.
        [EntityID] INT NULL,
        [Description] NVARCHAR(MAX) NULL,
        [IPAddress] NVARCHAR(45) NULL,
        [UserAgent] NVARCHAR(500) NULL,
        [Success] BIT NOT NULL DEFAULT 1,
        [ErrorMessage] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT [FK_AuditLog_Users] FOREIGN KEY ([UserID]) REFERENCES [dbo].[Users]([UserID]) ON DELETE SET NULL
    );
    
    CREATE INDEX [IX_AuditLog_UserID] ON [dbo].[AuditLog]([UserID]);
    CREATE INDEX [IX_AuditLog_Action] ON [dbo].[AuditLog]([Action]);
    CREATE INDEX [IX_AuditLog_EntityType] ON [dbo].[AuditLog]([EntityType]);
    CREATE INDEX [IX_AuditLog_CreatedAt] ON [dbo].[AuditLog]([CreatedAt]);
END
GO

-- Stored Procedure: Clean expired sessions
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_CleanExpiredSessions]') AND type in (N'P'))
    DROP PROCEDURE [dbo].[sp_CleanExpiredSessions];
GO

CREATE PROCEDURE [dbo].[sp_CleanExpiredSessions]
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM [dbo].[UserSessions] 
    WHERE [ExpiresAt] < GETDATE() OR [IsActive] = 0;
END
GO

-- Trigger: Update Users.UpdatedAt on update
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'tr_Users_UpdateTimestamp')
    DROP TRIGGER [dbo].[tr_Users_UpdateTimestamp];
GO

CREATE TRIGGER [dbo].[tr_Users_UpdateTimestamp]
ON [dbo].[Users]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [dbo].[Users]
    SET [UpdatedAt] = GETDATE()
    FROM [dbo].[Users] u
    INNER JOIN inserted i ON u.[UserID] = i.[UserID];
END
GO

PRINT 'Authentication schema created successfully!';
PRINT '';
PRINT 'Next steps:';
PRINT '1. Create an admin user (see create-admin-user.sql)';
PRINT '2. Update your application code to use this authentication system';
PRINT '3. Run sp_CleanExpiredSessions periodically to clean up expired sessions';

