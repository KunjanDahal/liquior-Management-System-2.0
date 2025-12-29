/**
 * Users Repository
 * Handles all database operations for user authentication and management
 */

import sql from 'mssql';
import bcrypt from 'bcrypt';
import { getConnectionPool } from '../connection';
import { UserEntity, RoleEntity, UserSessionEntity } from '../types/database.types';
import { UserDTO, CreateUserRequest, UpdateUserRequest } from '../types/dto.types';
import { Logger } from '../../utils/Logger';

const logger = new Logger('UsersRepo');

// Password hashing configuration
const SALT_ROUNDS = 12; // bcrypt salt rounds (higher = more secure but slower)

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<UserEntity | null> {
  try {
    const pool = getConnectionPool();
    const result = await pool
      .request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT 
          UserID,
          Username,
          Email,
          PasswordHash,
          FirstName,
          LastName,
          RoleID,
          IsActive,
          MustChangePassword,
          PasswordChangedAt,
          LastLoginAt,
          FailedLoginAttempts,
          LockedUntil,
          CreatedAt,
          UpdatedAt,
          CreatedBy,
          UpdatedBy
        FROM Users
        WHERE Username = @username
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as UserEntity;
  } catch (error) {
    logger.error(`Error getting user by username ${username}:`, error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<UserEntity | null> {
  try {
    const pool = getConnectionPool();
    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          UserID,
          Username,
          Email,
          PasswordHash,
          FirstName,
          LastName,
          RoleID,
          IsActive,
          MustChangePassword,
          PasswordChangedAt,
          LastLoginAt,
          FailedLoginAttempts,
          LockedUntil,
          CreatedAt,
          UpdatedAt,
          CreatedBy,
          UpdatedBy
        FROM Users
        WHERE UserID = @userId
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as UserEntity;
  } catch (error) {
    logger.error(`Error getting user by ID ${userId}:`, error);
    throw error;
  }
}

/**
 * Get user with role information
 */
export async function getUserWithRole(userId: number): Promise<(UserEntity & { Role: RoleEntity }) | null> {
  try {
    const pool = getConnectionPool();
    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          u.UserID,
          u.Username,
          u.Email,
          u.PasswordHash,
          u.FirstName,
          u.LastName,
          u.RoleID,
          u.IsActive,
          u.MustChangePassword,
          u.PasswordChangedAt,
          u.LastLoginAt,
          u.FailedLoginAttempts,
          u.LockedUntil,
          u.CreatedAt,
          u.UpdatedAt,
          u.CreatedBy,
          u.UpdatedBy,
          r.RoleID AS Role_RoleID,
          r.RoleName,
          r.Description AS Role_Description,
          r.Permissions AS Role_Permissions,
          r.IsActive AS Role_IsActive,
          r.CreatedAt AS Role_CreatedAt,
          r.UpdatedAt AS Role_UpdatedAt
        FROM Users u
        INNER JOIN Roles r ON u.RoleID = r.RoleID
        WHERE u.UserID = @userId AND u.IsActive = 1
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
    return {
      ...(row as UserEntity),
      Role: {
        RoleID: row.Role_RoleID,
        RoleName: row.RoleName,
        Description: row.Role_Description,
        Permissions: row.Role_Permissions,
        IsActive: row.Role_IsActive,
        CreatedAt: row.Role_CreatedAt,
        UpdatedAt: row.Role_UpdatedAt,
      } as RoleEntity,
    };
  } catch (error) {
    logger.error(`Error getting user with role ${userId}:`, error);
    throw error;
  }
}

/**
 * Transform UserEntity with Role to UserDTO
 */
export function userEntityToDTO(user: UserEntity & { Role: RoleEntity }): UserDTO {
  let permissions: Record<string, string> | undefined;
  if (user.Role.Permissions) {
    try {
      permissions = JSON.parse(user.Role.Permissions);
    } catch (e) {
      logger.warn('Failed to parse role permissions JSON:', e);
    }
  }

  return {
    id: user.UserID,
    username: user.Username,
    email: user.Email,
    firstName: user.FirstName,
    lastName: user.LastName,
    fullName: `${user.FirstName} ${user.LastName}`,
    role: {
      id: user.Role.RoleID,
      name: user.Role.RoleName,
      description: user.Role.Description,
      permissions,
    },
    mustChangePassword: user.MustChangePassword,
    lastLoginAt: user.LastLoginAt,
  };
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUserRequest, createdBy?: number): Promise<number> {
  try {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(userData.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message || 'Invalid password');
    }

    // Hash password
    const passwordHash = await hashPassword(userData.password);

    const pool = getConnectionPool();
    const result = await pool
      .request()
      .input('username', sql.NVarChar, userData.username)
      .input('email', sql.NVarChar, userData.email || null)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .input('firstName', sql.NVarChar, userData.firstName)
      .input('lastName', sql.NVarChar, userData.lastName)
      .input('roleID', sql.Int, userData.roleID)
      .input('isActive', sql.Bit, userData.isActive !== undefined ? userData.isActive : true)
      .input('createdBy', sql.Int, createdBy || null)
      .query(`
        INSERT INTO Users (
          Username,
          Email,
          PasswordHash,
          FirstName,
          LastName,
          RoleID,
          IsActive,
          MustChangePassword,
          CreatedBy,
          CreatedAt,
          UpdatedAt
        )
        OUTPUT INSERTED.UserID
        VALUES (
          @username,
          @email,
          @passwordHash,
          @firstName,
          @lastName,
          @roleID,
          @isActive,
          1,
          @createdBy,
          GETDATE(),
          GETDATE()
        )
      `);

    const userId = result.recordset[0].UserID;
    logger.info(`Created user: ${userData.username} (ID: ${userId})`);
    return userId;
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint')) {
      throw new Error('Username or email already exists');
    }
    logger.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Update user information
 */
export async function updateUser(userId: number, updates: UpdateUserRequest, updatedBy?: number): Promise<void> {
  try {
    const pool = getConnectionPool();
    const request = pool.request().input('userId', sql.Int, userId);

    const updateFields: string[] = [];
    
    if (updates.firstName !== undefined) {
      request.input('firstName', sql.NVarChar, updates.firstName);
      updateFields.push('FirstName = @firstName');
    }
    
    if (updates.lastName !== undefined) {
      request.input('lastName', sql.NVarChar, updates.lastName);
      updateFields.push('LastName = @lastName');
    }
    
    if (updates.email !== undefined) {
      request.input('email', sql.NVarChar, updates.email || null);
      updateFields.push('Email = @email');
    }
    
    if (updates.roleID !== undefined) {
      request.input('roleID', sql.Int, updates.roleID);
      updateFields.push('RoleID = @roleID');
    }
    
    if (updates.isActive !== undefined) {
      request.input('isActive', sql.Bit, updates.isActive);
      updateFields.push('IsActive = @isActive');
    }

    if (updatedBy !== undefined) {
      request.input('updatedBy', sql.Int, updatedBy);
      updateFields.push('UpdatedBy = @updatedBy');
    }

    if (updateFields.length === 0) {
      return; // No updates to perform
    }

    updateFields.push('UpdatedAt = GETDATE()');

    await request.query(`
      UPDATE Users
      SET ${updateFields.join(', ')}
      WHERE UserID = @userId
    `);

    logger.info(`Updated user ID: ${userId}`);
  } catch (error) {
    logger.error(`Error updating user ${userId}:`, error);
    throw error;
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: number,
  newPassword: string,
  mustChangePassword: boolean = false
): Promise<void> {
  try {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message || 'Invalid password');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    const pool = getConnectionPool();
    await pool
      .request()
      .input('userId', sql.Int, userId)
      .input('passwordHash', sql.NVarChar, passwordHash)
      .input('mustChangePassword', sql.Bit, mustChangePassword)
      .query(`
        UPDATE Users
        SET 
          PasswordHash = @passwordHash,
          MustChangePassword = @mustChangePassword,
          PasswordChangedAt = GETDATE(),
          UpdatedAt = GETDATE()
        WHERE UserID = @userId
      `);

    logger.info(`Updated password for user ID: ${userId}`);
  } catch (error) {
    logger.error(`Error updating password for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Record failed login attempt
 */
export async function recordFailedLoginAttempt(username: string): Promise<void> {
  try {
    const pool = getConnectionPool();
    await pool
      .request()
      .input('username', sql.NVarChar, username)
      .query(`
        UPDATE Users
        SET 
          FailedLoginAttempts = FailedLoginAttempts + 1,
          UpdatedAt = GETDATE()
        WHERE Username = @username
      `);
  } catch (error) {
    logger.error('Error recording failed login attempt:', error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Reset failed login attempts and update last login
 */
export async function recordSuccessfulLogin(userId: number): Promise<void> {
  try {
    const pool = getConnectionPool();
    await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`
        UPDATE Users
        SET 
          LastLoginAt = GETDATE(),
          FailedLoginAttempts = 0,
          LockedUntil = NULL,
          UpdatedAt = GETDATE()
        WHERE UserID = @userId
      `);
  } catch (error) {
    logger.error(`Error recording successful login for user ${userId}:`, error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Create a user session
 */
export async function createUserSession(
  userId: number,
  token: string,
  refreshToken: string | null,
  expiresAt: Date,
  refreshExpiresAt: Date | null,
  ipAddress?: string,
  userAgent?: string
): Promise<number> {
  try {
    const pool = getConnectionPool();
    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .input('token', sql.NVarChar, token)
      .input('refreshToken', sql.NVarChar, refreshToken || null)
      .input('expiresAt', sql.DateTime, expiresAt)
      .input('refreshExpiresAt', sql.DateTime, refreshExpiresAt || null)
      .input('ipAddress', sql.NVarChar, ipAddress || null)
      .input('userAgent', sql.NVarChar, userAgent || null)
      .query(`
        INSERT INTO UserSessions (
          UserID,
          Token,
          RefreshToken,
          ExpiresAt,
          RefreshExpiresAt,
          IPAddress,
          UserAgent,
          IsActive,
          LastActivityAt,
          CreatedAt
        )
        OUTPUT INSERTED.SessionID
        VALUES (
          @userId,
          @token,
          @refreshToken,
          @expiresAt,
          @refreshExpiresAt,
          @ipAddress,
          @userAgent,
          1,
          GETDATE(),
          GETDATE()
        )
      `);

    const sessionId = result.recordset[0].SessionID;
    logger.info(`Created session ${sessionId} for user ${userId}`);
    return sessionId;
  } catch (error) {
    logger.error('Error creating user session:', error);
    throw error;
  }
}

/**
 * Get user session by token
 */
export async function getUserSessionByToken(token: string): Promise<UserSessionEntity | null> {
  try {
    const pool = getConnectionPool();
    const result = await pool
      .request()
      .input('token', sql.NVarChar, token)
      .query(`
        SELECT 
          SessionID,
          UserID,
          Token,
          RefreshToken,
          IPAddress,
          UserAgent,
          ExpiresAt,
          RefreshExpiresAt,
          IsActive,
          LastActivityAt,
          CreatedAt
        FROM UserSessions
        WHERE Token = @token AND IsActive = 1
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0] as UserSessionEntity;
  } catch (error) {
    logger.error('Error getting user session by token:', error);
    throw error;
  }
}

/**
 * Deactivate user session
 */
export async function deactivateUserSession(sessionId: number): Promise<void> {
  try {
    const pool = getConnectionPool();
    await pool
      .request()
      .input('sessionId', sql.Int, sessionId)
      .query(`
        UPDATE UserSessions
        SET IsActive = 0, LastActivityAt = GETDATE()
        WHERE SessionID = @sessionId
      `);

    logger.info(`Deactivated session ${sessionId}`);
  } catch (error) {
    logger.error(`Error deactivating session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Log audit event
 */
export async function logAuditEvent(
  userId: number | null,
  action: string,
  entityType: string | null,
  entityId: number | null,
  description: string | null,
  success: boolean,
  errorMessage: string | null,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const pool = getConnectionPool();
    await pool
      .request()
      .input('userId', sql.Int, userId || null)
      .input('action', sql.NVarChar, action)
      .input('entityType', sql.NVarChar, entityType || null)
      .input('entityId', sql.Int, entityId || null)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('success', sql.Bit, success)
      .input('errorMessage', sql.NVarChar, errorMessage || null)
      .input('ipAddress', sql.NVarChar, ipAddress || null)
      .input('userAgent', sql.NVarChar, userAgent || null)
      .query(`
        INSERT INTO AuditLog (
          UserID,
          Action,
          EntityType,
          EntityID,
          Description,
          Success,
          ErrorMessage,
          IPAddress,
          UserAgent,
          CreatedAt
        )
        VALUES (
          @userId,
          @action,
          @entityType,
          @entityId,
          @description,
          @success,
          @errorMessage,
          @ipAddress,
          @userAgent,
          GETDATE()
        )
      `);
  } catch (error) {
    logger.error('Error logging audit event:', error);
    // Don't throw - audit logging should not break the application
  }
}

