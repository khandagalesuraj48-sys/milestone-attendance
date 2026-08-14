import { Router, Request, Response, NextFunction } from 'express';
import { schedulerService } from '../services/schedulerService';
import { adminAuth } from '../firebaseAdmin';
import { usersRepository } from '../repositories/usersRepository';

export const schedulerRouter = Router();

// Internal secret or admin authorization middleware
async function requireSchedulerAuth(req: Request, res: Response, next: NextFunction) {
  const xSchedulerSecret = req.headers['x-scheduler-secret'] as string | undefined;
  const authHeader = req.headers['authorization'] as string | undefined;
  const expectedSecret = process.env.SCHEDULER_SECRET;

  // 1. Direct X-Scheduler-Secret header validation
  if (expectedSecret && xSchedulerSecret && xSchedulerSecret === expectedSecret) {
    return next();
  }

  // 2. Authorization header secret validation
  if (expectedSecret && authHeader === `Bearer ${expectedSecret}`) {
    return next();
  }

  // 3. Authenticated Admin Firebase ID token verification (Admin fallback)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token && token !== expectedSecret) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        const user = await usersRepository.getByUid(decoded.uid);
        if (user) {
          if (user.role === 'admin' && user.accountStatus === 'ACTIVE') {
            return next();
          }
          if (user.role === 'employee') {
            return res.status(403).json({
              success: false,
              error: 'FORBIDDEN',
              message: 'Only administrators can execute scheduler operations.',
            });
          }
        }
      } catch {}
    }
  }

  // 4. In development mode only, permit if SCHEDULER_SECRET is not configured
  if (!expectedSecret && process.env.NODE_ENV !== 'production') {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'UNAUTHORIZED_SCHEDULER_CALL',
    message: 'Valid X-Scheduler-Secret header or Administrator authentication required.',
  });
}

schedulerRouter.use(requireSchedulerAuth);

// POST /api/v1/scheduler/auto-sign-out/day (01:00 AM IST)
schedulerRouter.post('/auto-sign-out/day', async (req: Request, res: Response) => {
  try {
    const result = await schedulerService.runDayShiftAutoSignOut();
    return res.json({
      success: true,
      job: 'DAY_SHIFT_AUTO_SIGN_OUT',
      processedCount: result.processedCount,
      recordIds: result.recordIds,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/scheduler/auto-sign-out/night (08:00 AM IST)
schedulerRouter.post('/auto-sign-out/night', async (req: Request, res: Response) => {
  try {
    const result = await schedulerService.runNightShiftAutoSignOut();
    return res.json({
      success: true,
      job: 'NIGHT_SHIFT_AUTO_SIGN_OUT',
      processedCount: result.processedCount,
      recordIds: result.recordIds,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
