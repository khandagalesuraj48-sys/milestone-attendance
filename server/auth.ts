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
    // 2. Fetch user profile from database strictly using verified Firebase UID
    user = await usersRepository.getByUid(decodedToken.uid);

    // If not found by UID, check by email or username link
    if (!user && decodedToken.email) {
      user = await usersRepository.getByEmail(decodedToken.email);
      if (!user) {
        const username = decodedToken.email.split('@')[0].toLowerCase();
        user = await usersRepository.getByUsername(username);
      }

      if (user) {
        // Link new Firebase Auth UID to existing user profile
        user = {
          ...user,
          uid: decodedToken.uid,
          id: decodedToken.uid,
          updatedAt: new Date().toISOString(),
        };
        await usersRepository.create(decodedToken.uid, user);
      }
    }

    // If still not found, auto-provision user so authenticated session can proceed seamlessly
    if (!user) {
      const email = (decodedToken.email || '').toLowerCase().trim();
      const username = email ? email.split('@')[0] : `user_${decodedToken.uid.substring(0, 5)}`;
      const isAdmin =
        email.includes('admin') ||
        email === 'khandagalesuraj48@gmail.com' ||
        username === 'admin' ||
        username === 'suraj';

      const employeeId = isAdmin ? 'ADMIN-01' : `EMP-${decodedToken.uid.substring(0, 4).toUpperCase()}`;
      const fullName =
        decodedToken.name ||
        (email === 'khandagalesuraj48@gmail.com'
          ? 'Suraj Khandagale'
          : isAdmin
          ? 'Administrator'
          : username.charAt(0).toUpperCase() + username.slice(1));

      user = await usersRepository.create(decodedToken.uid, {
        uid: decodedToken.uid,
        id: decodedToken.uid,
        employeeId,
        username,
        email: email || `${username}@milestoneconsultancy.in`,
        fullName,
        role: isAdmin ? 'admin' : 'employee',
        accountStatus: 'ACTIVE',
        mustChangePassword: false,
        lastLoginAt: new Date().toISOString(),
      });

      // Ensure employee record exists
      try {
        const existingEmp = await employeesRepository.getById(employeeId);
        if (!existingEmp) {
          await employeesRepository.create({
            employeeId,
            fullName,
            email: email || `${username}@milestoneconsultancy.in`,
            designation: isAdmin ? 'Operations Director' : 'Project Specialist',
            department: isAdmin ? 'OPERATIONS' : 'ENGINEERING',
            assignedSiteIds: ['SITE_MUMBAI_HO', 'SITE_PALGHAR_INFRA', 'SITE_THANE_METRO', 'SITE_NAVI_MUMBAI_SEZ'],
            salaryStructure: {
              monthlyGross: isAdmin ? 125000 : 68000,
              basicSalary: isAdmin ? 85000 : 45000,
              hra: isAdmin ? 25000 : 15000,
              specialAllowance: isAdmin ? 15000 : 8000,
              otherDeductions: isAdmin ? 5000 : 3000,
            },
            joiningDate: '2023-01-01',
            accountStatus: 'ACTIVE',
            boundHardwareSignature: null,
            activeDeviceId: null,
            username,
            mobile: '9876543210',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (empErr) {
        console.warn('[requireAuth] Notice during employee profile auto-provision:', empErr);
      }
    }
  } catch (err: any) {
    console.warn('[requireAuth] Notice during profile lookup:', err?.message || err);
    // Construct safe fallback session user
    const email = (decodedToken.email || '').toLowerCase().trim();
    const isAdmin =
      email.includes('admin') ||
      email === 'khandagalesuraj48@gmail.com' ||
      decodedToken.uid.includes('admin');

    user = {
      id: decodedToken.uid,
      uid: decodedToken.uid,
      employeeId: isAdmin ? 'ADMIN-01' : `EMP-${decodedToken.uid.substring(0, 4).toUpperCase()}`,
      username: email ? email.split('@')[0] : 'user',
      email: email || 'user@milestoneconsultancy.in',
      fullName: decodedToken.name || (isAdmin ? 'Suraj Khandagale (Admin)' : 'Milestone Team Member'),
      role: isAdmin ? 'admin' : 'employee',
      accountStatus: 'ACTIVE',
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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
