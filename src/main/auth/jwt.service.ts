/**
 * JWT Service
 * Handles token generation, validation, and refresh token management
 */

import jwt from 'jsonwebtoken';
import { Logger } from '../utils/Logger';

const logger = new Logger('JWTService');

// JWT Secret - In production, this should come from environment variables
// Generate a strong secret: openssl rand -base64 32
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production-minimum-32-characters-long';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '24h'; // 24 hours
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export interface TokenPayload {
  userId: number;
  username: string;
  roleId: number;
  roleName: string;
  sessionId?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

/**
 * Generate access and refresh token pair
 */
export function generateTokenPair(payload: TokenPayload): TokenPair {
  try {
    // Access token
    const accessToken = jwt.sign(
      {
        userId: payload.userId,
        username: payload.username,
        roleId: payload.roleId,
        roleName: payload.roleName,
        sessionId: payload.sessionId,
        type: 'access',
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Refresh token
    const refreshToken = jwt.sign(
      {
        userId: payload.userId,
        username: payload.username,
        sessionId: payload.sessionId,
        type: 'refresh',
      },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Calculate expiration dates
    const decodedAccess = jwt.decode(accessToken) as { exp: number };
    const decodedRefresh = jwt.decode(refreshToken) as { exp: number };

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(decodedAccess.exp * 1000),
      refreshExpiresAt: new Date(decodedRefresh.exp * 1000),
    };
  } catch (error) {
    logger.error('Error generating token pair:', error);
    throw new Error('Failed to generate authentication tokens');
  }
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== 'access') {
      logger.warn('Token is not an access token');
      return null;
    }

    return {
      userId: decoded.userId,
      username: decoded.username,
      roleId: decoded.roleId,
      roleName: decoded.roleName,
      sessionId: decoded.sessionId,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid access token:', error.message);
    } else {
      logger.error('Error verifying access token:', error);
    }
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: number; username: string; sessionId?: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as any;
    
    if (decoded.type !== 'refresh') {
      logger.warn('Token is not a refresh token');
      return null;
    }

    return {
      userId: decoded.userId,
      username: decoded.username,
      sessionId: decoded.sessionId,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid refresh token:', error.message);
    } else {
      logger.error('Error verifying refresh token:', error);
    }
    return null;
  }
}

/**
 * Decode token without verification (for inspection only)
 */
export function decodeToken(token: string): any {
  return jwt.decode(token);
}

