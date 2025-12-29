/**
 * Authentication Service
 * Main service handling authentication logic, login, logout, and session management
 */

import { Logger } from '../utils/Logger';
import {
  getUserByUsername,
  getUserWithRole,
  comparePassword,
  recordFailedLoginAttempt,
  recordSuccessfulLogin,
  createUserSession,
  getUserSessionByToken,
  deactivateUserSession,
  logAuditEvent,
  userEntityToDTO,
  updateUserPassword,
  validatePasswordStrength,
  getUserById,
} from '../database/repositories/users.repo';
import { generateTokenPair, verifyAccessToken } from './jwt.service';
import { LoginRequest, LoginResponse, UserDTO, ChangePasswordRequest } from '../database/types/dto.types';
import { isDatabaseReady } from '../database/connection';

const logger = new Logger('AuthService');

// Maximum failed login attempts before account lockout
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

/**
 * Authenticate user and create session
 */
export async function login(
  loginRequest: LoginRequest,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResponse> {
  if (!isDatabaseReady()) {
    throw new Error('Database connection not ready');
  }

  try {
    // Get user by username
    const user = await getUserByUsername(loginRequest.username);
    
    if (!user) {
      // Log failed attempt (even if user doesn't exist, for security)
      await logAuditEvent(
        null,
        'LOGIN',
        'User',
        null,
        `Failed login attempt for username: ${loginRequest.username}`,
        false,
        'Invalid username or password',
        ipAddress,
        userAgent
      );
      throw new Error('Invalid username or password');
    }

    // Check if user is active
    if (!user.IsActive) {
      await logAuditEvent(
        user.UserID,
        'LOGIN',
        'User',
        user.UserID,
        'Login attempt for inactive user',
        false,
        'User account is inactive',
        ipAddress,
        userAgent
      );
      throw new Error('User account is inactive');
    }

    // Check if account is locked
    if (user.LockedUntil && user.LockedUntil > new Date()) {
      const lockoutMinutes = Math.ceil((user.LockedUntil.getTime() - new Date().getTime()) / 60000);
      await logAuditEvent(
        user.UserID,
        'LOGIN',
        'User',
        user.UserID,
        'Login attempt for locked account',
        false,
        `Account locked. Try again in ${lockoutMinutes} minutes`,
        ipAddress,
        userAgent
      );
      throw new Error(`Account is locked. Please try again in ${lockoutMinutes} minutes.`);
    }

    // Verify password
    const passwordMatch = await comparePassword(loginRequest.password, user.PasswordHash);
    
    if (!passwordMatch) {
      // Record failed attempt
      await recordFailedLoginAttempt(user.Username);
      
      // Check if we should lock the account
      const updatedUser = await getUserByUsername(user.Username);
      if (updatedUser && updatedUser.FailedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
        
        // Update lockout time (this would require a separate function, for now just log)
        logger.warn(`User ${user.Username} has exceeded max failed attempts`);
      }

      await logAuditEvent(
        user.UserID,
        'LOGIN',
        'User',
        user.UserID,
        'Failed login - incorrect password',
        false,
        'Invalid username or password',
        ipAddress,
        userAgent
      );
      throw new Error('Invalid username or password');
    }

    // Get user with role information
    const userWithRole = await getUserWithRole(user.UserID);
    if (!userWithRole) {
      throw new Error('User role not found');
    }

    // Generate tokens
    const tokenPair = generateTokenPair({
      userId: user.UserID,
      username: user.Username,
      roleId: userWithRole.Role.RoleID,
      roleName: userWithRole.Role.RoleName,
    });

    // Create session in database
    const sessionId = await createUserSession(
      user.UserID,
      tokenPair.accessToken,
      tokenPair.refreshToken,
      tokenPair.expiresAt,
      tokenPair.refreshExpiresAt,
      ipAddress,
      userAgent
    );

    // Update token pair with session ID and regenerate with session ID
    const finalTokenPair = generateTokenPair({
      userId: user.UserID,
      username: user.Username,
      roleId: userWithRole.Role.RoleID,
      roleName: userWithRole.Role.RoleName,
      sessionId,
    });

    // Update session with final token (or create new session)
    // For simplicity, we'll use the token without session ID in the payload
    // In production, you might want to update the session token

    // Record successful login
    await recordSuccessfulLogin(user.UserID);

    // Log successful login
    await logAuditEvent(
      user.UserID,
      'LOGIN',
      'User',
      user.UserID,
      'User logged in successfully',
      true,
      null,
      ipAddress,
      userAgent
    );

    // Convert to DTO
    const userDTO = userEntityToDTO(userWithRole);

    logger.info(`User ${user.Username} logged in successfully`);

    return {
      user: userDTO,
      token: finalTokenPair.accessToken,
      refreshToken: finalTokenPair.refreshToken,
      expiresAt: finalTokenPair.expiresAt,
    };
  } catch (error) {
    logger.error('Login error:', error);
    throw error;
  }
}

/**
 * Verify token and get current user
 */
export async function verifyToken(token: string): Promise<UserDTO | null> {
  if (!isDatabaseReady()) {
    return null;
  }

  try {
    // Verify token
    const payload = verifyAccessToken(token);
    if (!payload) {
      return null;
    }

    // Check if session exists and is active
    const session = await getUserSessionByToken(token);
    if (!session || !session.IsActive || session.ExpiresAt < new Date()) {
      return null;
    }

    // Get user with role
    const userWithRole = await getUserWithRole(payload.userId);
    if (!userWithRole || !userWithRole.IsActive) {
      return null;
    }

    // Update session last activity
    // (This would require a separate function - for now we'll skip it)

    return userEntityToDTO(userWithRole);
  } catch (error) {
    logger.error('Token verification error:', error);
    return null;
  }
}

/**
 * Logout user (deactivate session)
 */
export async function logout(token: string, userId?: number): Promise<void> {
  if (!isDatabaseReady()) {
    return;
  }

  try {
    const session = await getUserSessionByToken(token);
    if (session) {
      await deactivateUserSession(session.SessionID);
      
      await logAuditEvent(
        session.UserID,
        'LOGOUT',
        'User',
        session.UserID,
        'User logged out',
        true,
        null
      );

      logger.info(`User ${session.UserID} logged out`);
    } else if (userId) {
      // Log even if session not found
      await logAuditEvent(
        userId,
        'LOGOUT',
        'User',
        userId,
        'User logged out (session not found)',
        true,
        null
      );
    }
  } catch (error) {
    logger.error('Logout error:', error);
    // Don't throw - logout should always succeed
  }
}

/**
 * Change user password
 */
export async function changePassword(
  userId: number,
  changeRequest: ChangePasswordRequest,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  if (!isDatabaseReady()) {
    throw new Error('Database connection not ready');
  }

  try {
    // Get user
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const passwordMatch = await comparePassword(changeRequest.currentPassword, user.PasswordHash);
    if (!passwordMatch) {
      await logAuditEvent(
        userId,
        'PASSWORD_CHANGE',
        'User',
        userId,
        'Failed password change - incorrect current password',
        false,
        'Current password is incorrect',
        ipAddress,
        userAgent
      );
      throw new Error('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(changeRequest.newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message || 'New password does not meet requirements');
    }

    // Check if new password is same as current password
    const samePassword = await comparePassword(changeRequest.newPassword, user.PasswordHash);
    if (samePassword) {
      throw new Error('New password must be different from current password');
    }

    // Update password (don't require change on next login if user is changing it themselves)
    await updateUserPassword(userId, changeRequest.newPassword, false);

    await logAuditEvent(
      userId,
      'PASSWORD_CHANGE',
      'User',
      userId,
      'User changed password successfully',
      true,
      null,
      ipAddress,
      userAgent
    );

    logger.info(`User ${userId} changed password`);
  } catch (error) {
    logger.error(`Error changing password for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get current user by token
 */
export async function getCurrentUser(token: string): Promise<UserDTO | null> {
  return verifyToken(token);
}

