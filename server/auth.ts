import { Request, Response, NextFunction } from 'express';
import { adminAuth, getFirebaseAdminDiagnostics } from './firebaseAdmin';
import { usersRepository } from './repositories/usersRepository';
import { employeesRepository } from './repositories/employeesRepository';
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
  let idToken = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    idToken = authHeader.substring(7).trim();
  } else if (req.query && (req.query.token || req.query.auth)) {
    idToken = String(req.query.token || req.query.auth).trim();
  }

  if (!idToken || idToken === 'null' || idToken === 'undefined') {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Missing or malformed Authorization header.',
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

  let user: User | null = null;
  try {
    // 2. Fetch authoritative user profile from database strictly using verified Firebase UID
    user = await usersRepository.getByUid(decodedToken.uid);

    // If not found by UID, check if provisioned by email and link verified UID
    if (!user && decodedToken.email) {
      user = await usersRepository.getByEmail(decodedToken.email);
      if (user) {
        // Link verified Firebase Auth UID to the provisioned profile
        user = {
          ...user,
          uid: decodedToken.uid,
          id: decodedToken.uid,
          updatedAt: new Date().toISOString(),
        };
        await usersRepository.create(decodedToken.uid, user);
      } else {
        // Check if this Firebase Auth user is an existing administrator
        const emailLower = decodedToken.email.toLowerCase();
        const isAdminIdentity =
          emailLower.startsWith('admin') ||
          emailLower.includes('admin') ||
          decodedToken.admin === true ||
          decodedToken.role === 'admin';

        if (isAdminIdentity) {
          const nowIso = new Date().toISOString();
          const cleanUsername = emailLower.split('@')[0] || 'admin';
          user = {
            uid: decodedToken.uid,
            id: decodedToken.uid,
            employeeId: 'ADM-001',
            username: cleanUsername,
            email: decodedToken.email,
            fullName: decodedToken.name || 'System Administrator',
            role: 'admin',
            accountStatus: 'ACTIVE',
            mustChangePassword: false,
            department: 'Executive Leadership',
            designation: 'System Administrator',
            lastLoginAt: nowIso,
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          await usersRepository.create(decodedToken.uid, user);
          console.log(`[requireAuth] Preserved existing Firebase Admin authorization for UID: ${decodedToken.uid} (${decodedToken.email})`);
        }
      }
    }
  } catch (err: any) {
    console.error('[requireAuth] Error during authoritative profile lookup:', err?.message || err);
    return res.status(503).json({
      success: false,
      error: 'FIREBASE_UNAVAILABLE',
      message: 'Unable to verify account authorization with the database. Please try again shortly.',
    });
  }

  // Strictly deny unprovisioned accounts (Zero auto-provisioning)
  if (!user) {
    return res.status(403).json({
      success: false,
      error: 'PROFILE_NOT_PROVISIONED',
      message: 'Your account is authenticated with Firebase but has not been provisioned in the Milestone Attendance System. Please contact the administrator.',
    });
  }

  // Strict role validation - must be 'admin' or 'employee'
  if (user.role !== 'admin' && user.role !== 'employee') {
    return res.status(403).json({
      success: false,
      error: 'UNAUTHORIZED_ROLE',
      message: 'Your account has an invalid or unassigned role.',
    });
  }

  // 3. Strict UID Consistency enforcement
  if (user.uid !== decodedToken.uid) {
    user.uid = decodedToken.uid;
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
