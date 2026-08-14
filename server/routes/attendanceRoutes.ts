import { Router, Response } from 'express';
import { requireAuth, requirePasswordUpdated, enforceEmployeeScope, AuthenticatedRequest } from '../auth';
import { attendanceService } from '../services/attendanceService';
import { shiftService } from '../services/shiftService';
import { attendanceRepository } from '../repositories/attendanceRepository';
import { employeesRepository } from '../repositories/employeesRepository';
import { sitesRepository } from '../repositories/sitesRepository';
import { locationsRepository } from '../repositories/locationsRepository';
import { devicesRepository } from '../repositories/devicesRepository';
import { leavesRepository } from '../repositories/leavesRepository';
import { auditRepository } from '../repositories/auditRepository';
import { LeaveRecord } from '../../src/types';

export const attendanceRouter = Router();

// All attendance endpoints require authenticated user & no pending password change
attendanceRouter.use(requireAuth);
attendanceRouter.use(requirePasswordUpdated);
attendanceRouter.use(enforceEmployeeScope);

// GET /api/v1/attendance/sites - Get sites authorized for the current user
attendanceRouter.get('/sites', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    let allSites = await sitesRepository.getActive();
    if (user.role === 'employee') {
      const emp = await employeesRepository.getById(user.employeeId);
      const assignedIds = emp?.assignedSiteIds || [];
      allSites = allSites.filter((s) => assignedIds.includes(s.siteId));
    }
    return res.json({ success: true, sites: allSites });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/locations - Approved geofence locations
attendanceRouter.get('/locations', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    let allLocations = await locationsRepository.getActive();
    if (user.role === 'employee') {
      const emp = await employeesRepository.getById(user.employeeId);
      const assignedSiteIds = emp?.assignedSiteIds || [];
      allLocations = allLocations.filter((loc) => !loc.siteId || assignedSiteIds.includes(loc.siteId));
    }
    return res.json({ success: true, locations: allLocations });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/attendance/punch-in
attendanceRouter.post('/punch-in', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { shiftType, siteId, locationId, latitude, longitude, accuracy, installationKey } = req.body;

  if (!shiftType || !siteId || !locationId || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'MISSING_PARAMETERS',
      message: 'shiftType, siteId, locationId, latitude, and longitude are required.',
    });
  }

  try {
    const result = await attendanceService.punchIn({
      user,
      shiftType,
      siteId,
      locationId,
      latitude,
      longitude,
      accuracy: typeof accuracy === 'number' ? accuracy : 10,
      installationKey,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Web Browser',
    });

    return res.json({
      success: true,
      message: result.message,
      record: result.record,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: 'PUNCH_IN_REJECTED',
      message: err.message || 'Punch in failed validation.',
    });
  }
});

// POST /api/v1/attendance/punch-out
attendanceRouter.post('/punch-out', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { latitude, longitude, accuracy } = req.body;

  try {
    const result = await attendanceService.punchOut({
      user,
      latitude: typeof latitude === 'number' ? latitude : 18.6570,
      longitude: typeof longitude === 'number' ? longitude : 72.8790,
      accuracy: typeof accuracy === 'number' ? accuracy : 10,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Web Browser',
    });

    return res.json({
      success: true,
      message: result.message,
      record: result.record,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: 'PUNCH_OUT_REJECTED',
      message: err.message || 'Punch out failed.',
    });
  }
});

// GET /api/v1/attendance/my-today - Current shift, active session & notices
attendanceRouter.get('/my-today', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const ist = shiftService.getISTDateParts();
  const businessDate = ist.dateStr;

  try {
    const activeSession = await attendanceRepository.getActiveSession(user.employeeId);
    const todayShifts = await attendanceRepository.getByEmployeeAndDate(user.employeeId, businessDate);
    const recentAutoSignedOut = await attendanceRepository.getRecentAutoSignedOut(user.employeeId);

    let recentAutoSignOutNotice = null;
    if (recentAutoSignedOut) {
      recentAutoSignOutNotice = {
        recordId: recentAutoSignedOut.recordId || recentAutoSignedOut.id,
        shiftType: recentAutoSignedOut.shiftType,
        businessDate: recentAutoSignedOut.businessDate,
        siteName: recentAutoSignedOut.siteNameSnapshot,
        message: `Notice: Your ${recentAutoSignedOut.shiftType} shift on ${recentAutoSignedOut.businessDate} was automatically signed out due to end-of-window cutoff. Attendance marked as Half-Day. Please remember to manually sign out at the end of each shift.`,
      };
    }

    return res.json({
      success: true,
      activeSession,
      shifts: todayShifts,
      recentAutoSignOutNotice,
      istTime: ist.timeStr,
      businessDate,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/my-history - Monthly register for current employee
attendanceRouter.get('/my-history', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const month = (req.query.month as string) || shiftService.getISTDateParts().yearMonth;

  try {
    const records = await attendanceRepository.getMonthlyForEmployee(user.employeeId, month);

    let fullDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let lateCount = 0;
    let totalWorkingMinutes = 0;
    let extraNights = 0;

    for (const r of records) {
      if (r.attendanceStatus === 'PRESENT_FULL_DAY') {
        fullDays++;
      } else if (r.attendanceStatus === 'PRESENT_HALF_DAY') {
        halfDays++;
      } else if (r.attendanceStatus === 'ABSENT') {
        absentDays++;
      }
      if (r.isLate) lateCount++;
      if (r.isExtraShift) extraNights++;
      if (r.workingMinutes) totalWorkingMinutes += r.workingMinutes;
    }

    const presentCount = fullDays + (halfDays * 0.5);
    const totalHours = Number((totalWorkingMinutes / 60).toFixed(1));

    return res.json({
      success: true,
      month,
      records,
      stats: {
        presentCount,
        fullDays,
        halfDays,
        absentDays,
        lateCountInMonth: lateCount,
        lateCount,
        extraNights,
        totalWorkingMinutes,
        totalHours,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/my-profile - Comprehensive profile for authenticated employee
attendanceRouter.get('/my-profile', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const employee = await employeesRepository.getById(user.employeeId);
    let assignedSites: any[] = [];
    if (employee?.assignedSiteIds && employee.assignedSiteIds.length > 0) {
      const allSites = await sitesRepository.getActive();
      assignedSites = allSites.filter((s) => employee.assignedSiteIds.includes(s.siteId));
    }
    return res.json({
      success: true,
      user,
      employee,
      assignedSites,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/my-device
attendanceRouter.get('/my-device', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const employee = await employeesRepository.getById(user.employeeId);
    const activeDev = await devicesRepository.getActiveByEmployeeId(user.employeeId);
    const allDevs = await devicesRepository.getByEmployeeId(user.employeeId);

    return res.json({
      success: true,
      isBound: !!employee?.boundHardwareSignature,
      boundHardwareSignature: employee?.boundHardwareSignature,
      activeDevice: activeDev,
      deviceHistory: allDevs,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/leaves - Leave history
attendanceRouter.get('/leaves', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const list = await leavesRepository.getByEmployeeId(user.employeeId);
    return res.json({ success: true, leaves: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/attendance/leaves - Apply for leave
attendanceRouter.post('/leaves', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { leaveType, startDate, endDate, reason } = req.body;

  if (!leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({ success: false, error: 'All leave fields are required.' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const docId = `leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const leaveDoc: LeaveRecord = {
    id: docId,
    employeeId: user.employeeId,
    employeeName: user.fullName,
    leaveType,
    startDate,
    endDate,
    totalDays: diffDays,
    reason: String(reason).trim(),
    status: 'PENDING',
    reviewComment: null,
    reviewedByAdminId: null,
    reviewedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const created = await leavesRepository.create(leaveDoc);
    await auditRepository.log({
      actorId: user.employeeId,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'LEAVE_REQUESTED',
      targetId: docId,
      details: { leaveType, startDate, endDate, totalDays: diffDays },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: 'Leave application submitted successfully.',
      leave: created,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
