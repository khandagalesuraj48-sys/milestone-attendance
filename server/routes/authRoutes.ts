import { Router, Response } from 'express';
import { adminAuth } from '../firebaseAdmin';
import { usersRepository } from '../repositories/usersRepository';
import { employeesRepository } from '../repositories/employeesRepository';
import { auditRepository } from '../repositories/auditRepository';
import { deviceService } from '../services/deviceService';
import { requireAuth, AuthenticatedRequest, createRateLimiter } from '../auth';

export const authRouter = Router();

// Rate limiters for authentication endpoints to prevent brute-force & enumeration
const resolveIdentityLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 queries per minute per IP
  message: 'Too many identity resolution requests. Please slow down.',
});

const sessionInitLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 40,
  message: 'Too many session initialization requests. Please wait a moment.',
});

const passwordChangeLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many password change attempts. Please try again later.',
});

// POST /api/v1/auth/resolve-identity
// Maps a user-entered username to their registered Firebase Auth email identity
// ENUMERATION-PROOF SPECIFICATION:
// 1. Constant time, zero Firestore lookup to eliminate timing & existence attacks
// 2. Never exposes user profile, employeeId, role, mobile, or account status
// 3. Uniform response format and deterministic synthetic email derivation
authRouter.post('/resolve-identity', resolveIdentityLimiter, async (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Username is required.',
    });
  }

  const clean = username.trim().toLowerCase();
  if (!clean) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Username cannot be empty.',
    });
  }

  // If already an email format, return normalized email
  if (clean.includes('@')) {
    return res.json({ success: true, email: clean });
  }

  // Sanitize username characters (alphanumeric, dot, underscore, dash)
  const sanitized = clean.replace(/[^a-z0-9._-]/g, '');
  const derivedEmail = `${sanitized || 'user'}@milestoneconsultancy.in`;

  // Always return the standard internal identity without querying user existence
  return res.json({
    success: true,
    email: derivedEmail,
  });
});

// POST /api/v1/auth/session-init
// Called immediately after client acquires Firebase ID Token via signInWithEmailAndPassword.
// Enforces hardware device binding, records login audit, and returns user profile.
authRouter.post('/session-init', sessionInitLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { installationKey } = req.body;

  // 1. Hardware Device Binding Check for Employees (executed AFTER Firebase Auth)
  if (user.role === 'employee' && installationKey) {
    const devCheck = await deviceService.validateOrBindDevice(
      user.employeeId,
      user.fullName,
      installationKey,
      req.ip || '127.0.0.1',
      req.headers['user-agent'] || 'Web Browser'
    );

    if (!devCheck.isValid) {
      // Log security event for device mismatch
      await auditRepository.log({
        actorId: user.employeeId,
        actorName: user.fullName,
        actorRole: user.role,
        action: 'DEVICE_MISMATCH',
        targetId: user.uid,
        details: {
          error: devCheck.error,
          installationKey,
          clientIp: req.ip,
          userAgent: req.headers['user-agent'],
        },
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(403).json({
        success: false,
        error: 'DEVICE_UNAUTHORIZED',
        message: devCheck.error || 'Device binding unauthorized for this account.',
      });
    }

    if (devCheck.isNewBinding) {
      await auditRepository.log({
        actorId: user.employeeId,
        actorName: user.fullName,
        actorRole: user.role,
        action: 'DEVICE_BOUND',
        targetId: user.uid,
        details: {
          installationKey,
          clientIp: req.ip,
          userAgent: req.headers['user-agent'],
        },
        ipAddress: req.ip || '127.0.0.1',
      });
    }
  }

  // 2. Update last login timestamp in Firestore
  await usersRepository.update(user.uid, {
    lastLoginAt: new Date().toISOString(),
  });

  // 3. Record successful login audit log
  await auditRepository.log({
    actorId: user.employeeId,
    actorName: user.fullName,
    actorRole: user.role,
    action: 'LOGIN_SUCCESS',
    targetId: user.uid,
    details: {
      clientIp: req.ip,
      userAgent: req.headers['user-agent'],
      deviceBound: !!installationKey,
    },
    ipAddress: req.ip || '127.0.0.1',
  });

  return res.json({
    success: true,
    user,
    message: `Authenticated as ${user.fullName} (${user.role.toUpperCase()})`,
  });
});

// POST /api/v1/auth/change-password
// Allows authenticated users to update their temporary password on first login
authRouter.post('/change-password', passwordChangeLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PASSWORD',
      message: 'New password is required.',
    });
  }

  const cleanPass = newPassword.trim();
  if (cleanPass.length < 8 || cleanPass.length > 128) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PASSWORD_LENGTH',
      message: 'Password must be between 8 and 128 characters long.',
    });
  }

  if (confirmPassword && typeof confirmPassword === 'string') {
    if (cleanPass !== confirmPassword.trim()) {
      return res.status(400).json({
        success: false,
        error: 'PASSWORD_MISMATCH',
        message: 'New password and confirmation password do not match.',
      });
    }
  }

  try {
    // 1. Update password in Firebase Authentication
    await adminAuth.updateUser(user.uid, { password: cleanPass });

    // 2. Update Firestore user document to mark mustChangePassword = false
    await usersRepository.update(user.uid, {
      mustChangePassword: false,
    });

    // 3. Fetch latest authoritative user profile from Firestore
    const updatedUser = await usersRepository.getByUid(user.uid);

    // 4. Audit the password change event
    await auditRepository.log({
      actorId: user.employeeId,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'PASSWORD_CHANGED',
      targetId: user.uid,
      details: {
        message: user.mustChangePassword
          ? 'First-login temporary password successfully updated.'
          : 'User password changed.',
      },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      user: updatedUser || { ...user, mustChangePassword: false },
      message: 'Your password has been successfully updated. Welcome to Milestone Workforce Platform.',
    });
  } catch (err: any) {
    console.error('[change-password] Error updating password:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'PASSWORD_UPDATE_FAILED',
      message: err.message || 'Failed to update password. Please try again.',
    });
  }
});

// GET /api/v1/auth/me
// Returns the currently authenticated user profile from Firestore based on verified Firebase UID
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

// POST /api/v1/auth/logout
authRouter.post('/logout', (req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true, message: 'Logged out successfully.' });
});
