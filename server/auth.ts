import { Request, Response, NextFunction } from 'express';
import { adminAuth, getFirebaseAdminDiagnostics } from './firebaseAdmin';
import { usersRepository } from './repositories/usersRepository';
import { User } from '../src/types';

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

/**
 * Authoritative Firebase ID Token verification middleware
 * Firebase Authentication is the single, authoritative authentication system.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Missing or malformed Authorization header.',
    });
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken || idToken === 'null' || idToken === 'undefined') {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Valid Firebase ID token is required.',
    });
  }

  let decodedToken: any;
  try {
    // 1. Authoritative verification against Firebase Admin
    decodedToken = await adminAuth.verifyIdToken(idToken);
    req.token = idToken;
  } catch (err: any) {
    // Token is invalid, expired, revoked, or malformed
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication token is invalid or expired. Please sign in again.',
    });
  }

  let user: User | null;
  try {
    // 2. Fetch user profile from Firestore strictly using verified Firebase UID
    user = await usersRepository.getByUid(decodedToken.uid);
  } catch (err: any) {
    const adminDiag = getFirebaseAdminDiagnostics();
    console.error('[requireAuth] Firestore lookup failed with diagnostic info:', JSON.stringify({
      errorName: err?.name || 'Error',
      errorCode: err?.code || 'UNKNOWN',
      errorMessage: err?.message || 'Unknown database error',
      errorDetails: err?.details || null,
      serviceAccountPresent: adminDiag.serviceAccountEnvExists,
      serviceAccountLength: adminDiag.serviceAccountEnvLength,
      parseStatus: adminDiag.parseStatus,
      parseErrorMessage: adminDiag.parseErrorMessage,
      detectedProjectId: adminDiag.detectedProjectId,
      initMode: adminDiag.initMode,
      initErrorMessage: adminDiag.initErrorMessage,
      hasPrivateKey: adminDiag.hasPrivateKey,
      hasClientEmail: adminDiag.hasClientEmail,
      queriedUidLength: decodedToken.uid ? decodedToken.uid.length : 0,
    }));
    return res.status(500).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: 'Failed to retrieve user profile from database',
    });
  }

  if (!user) {
    return res.status(403).json({
      success: false,
      error: 'PROFILE_NOT_PROVISIONED',
      message: 'Your account is authenticated but has not been provisioned in the attendance system. Please contact the administrator.',
    });
  }

  // 3. Strict UID Consistency enforcement
  if (user.uid !== decodedToken.uid) {
    return res.status(403).json({
      success: false,
      error: 'PROFILE_UID_MISMATCH',
      message: 'Security validation failed: profile UID does not match authenticated identity.',
    });
  }

  // 4. Enforce account status
  if (user.accountStatus && user.accountStatus !== 'ACTIVE') {
    return res.status(403).json({
      success: false,
      error: 'ACCOUNT_SUSPENDED',
      message: 'Your account has been deactivated or suspended. Please contact HR.',
    });
  }

  req.user = user;
  return next();
}

/**
 * Gatekeeper enforcing mandatory password change before accessing any operational routes
 */
export function requirePasswordUpdated(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user && req.user.mustChangePassword) {
    return res.status(403).json({
      success: false,
      error: 'PASSWORD_CHANGE_REQUIRED',
      message: 'You must update your initial temporary password before accessing system features.',
    });
  }
  return next();
}

/**
 * Role-Based Access Control (RBAC)
 */
export function requireRole(allowedRoles: ('admin' | 'employee')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Access denied. Requires one of [${allowedRoles.join(', ')}] roles.`,
      });
    }
    return next();
  };
}

/**
 * Anti-IDOR middleware ensuring employee can only query/modify their own records
 */
export function enforceEmployeeScope(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user && req.user.role === 'employee') {
    if (req.body && req.body.employeeId) {
      req.body.employeeId = req.user.employeeId;
    }
    if (req.query && req.query.employeeId) {
      req.query.employeeId = req.user.employeeId;
    }
  }
  return next();
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

/**
 * In-memory sliding-window rate limiter for abuse prevention on unauthenticated endpoints
 */
export function createRateLimiter(options: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
    const now = Date.now();
    const entry = hits.get(key);

    // Prune stale cache if map grows large in warm serverless containers
    if (hits.size > 1000) {
      for (const [k, v] of hits.entries()) {
        if (v.resetTime <= now) hits.delete(k);
      }
    }

    if (!entry || entry.resetTime <= now) {
      hits.set(key, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    if (entry.count >= options.max) {
      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message: options.message || 'Too many attempts. Please try again shortly.',
      });
    }

    entry.count += 1;
    return next();
  };
}
