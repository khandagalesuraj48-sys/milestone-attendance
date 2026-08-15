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
import { leaveLedgerRepository } from '../repositories/leaveLedgerRepository';
import { regularizationRepository } from '../repositories/regularizationRepository';
import { notificationsRepository } from '../repositories/notificationsRepository';
import { holidaysRepository } from '../repositories/holidaysRepository';
import { auditRepository } from '../repositories/auditRepository';
import { usersRepository } from '../repositories/usersRepository';
import { storageRepository } from '../repositories/storageRepository';
import { payrollRepository } from '../repositories/payrollRepository';
import { LeaveRecord, AttendanceRegularizationRequest, AppNotification } from '../../src/types';

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

// GET /api/v1/attendance/leaves/balance - Current employee leave balance & ledger
attendanceRouter.get('/leaves/balance', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const balance = await leaveLedgerRepository.getBalance(user.employeeId, user.fullName, user.department);
    const ledger = await leaveLedgerRepository.getLedger(user.employeeId);
    return res.json({ success: true, balance, ledger });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/attendance/leaves - Apply for leave with optional supporting document
attendanceRouter.post('/leaves', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { leaveType, startDate, endDate, reason, attachmentUrl, attachmentName, attachmentType, attachmentSize, attachmentId } = req.body;

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
    department: user.department,
    leaveType,
    startDate,
    endDate,
    totalDays: diffDays,
    reason: String(reason).trim(),
    attachmentUrl: attachmentUrl || null,
    attachmentName: attachmentName || null,
    attachmentType: attachmentType || null,
    attachmentSize: attachmentSize || null,
    attachmentId: attachmentId || null,
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
      details: { leaveType, startDate, endDate, totalDays: diffDays, hasAttachment: !!attachmentUrl },
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

// GET /api/v1/attendance/notifications - Persistent employee notifications
attendanceRouter.get('/notifications', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const notifications = await notificationsRepository.getByEmployeeId(user.employeeId);
    return res.json({ success: true, notifications });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/attendance/notifications/:id/read - Mark single notification as read
attendanceRouter.patch('/notifications/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await notificationsRepository.markAsRead(id, req.user!.employeeId);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/attendance/notifications/mark-all-read - Mark all notifications as read
attendanceRouter.post('/notifications/mark-all-read', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const count = await notificationsRepository.markAllAsRead(user.employeeId);
    return res.json({ success: true, count, message: `Marked ${count} notifications as read.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/regularize/my-requests - Get current employee regularization requests
attendanceRouter.get('/regularize/my-requests', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const requests = await regularizationRepository.getByEmployeeId(user.employeeId);
    return res.json({ success: true, requests });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/attendance/regularize - Submit Attendance Regularization Request
attendanceRouter.post('/regularize', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { attendanceDate, shiftType, requestedSignInTime, requestedSignOutTime, reason, attendanceRecordId, supportingDocUrl } = req.body;

  if (!attendanceDate || !shiftType || !reason || !requestedSignInTime || !requestedSignOutTime) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'Date, shift type, requested sign-in time, requested sign-out time, and explanation reason are required.',
    });
  }

  const cleanReason = String(reason).trim();
  if (cleanReason.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'REASON_TOO_SHORT',
      message: 'Please provide a clear justification reason of at least 10 characters.',
    });
  }

  const reqId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const regDoc: AttendanceRegularizationRequest = {
    id: reqId,
    employeeId: user.employeeId,
    employeeName: user.fullName,
    department: user.department || 'Operations',
    attendanceRecordId: attendanceRecordId || null,
    attendanceDate: String(attendanceDate).trim(),
    shiftType: shiftType as any,
    requestedSignInTime: String(requestedSignInTime).trim(),
    requestedSignOutTime: String(requestedSignOutTime).trim(),
    reason: cleanReason,
    supportingDocUrl: supportingDocUrl || null,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const created = await regularizationRepository.create(regDoc);
    await auditRepository.log({
      actorId: user.employeeId,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'REGULARIZATION_REQUESTED',
      targetId: reqId,
      details: { attendanceDate, shiftType, reason: cleanReason },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: 'Regularization request submitted successfully. Pending Admin review.',
      request: created,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/holidays - List holidays for employees
attendanceRouter.get('/holidays', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await holidaysRepository.getAll();
    const active = list.filter((h) => h.isActive !== false);
    return res.json({ success: true, holidays: active });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/team-feed - Announcements, Birthdays & Work Anniversaries
attendanceRouter.get('/team-feed', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const ist = shiftService.getISTDateParts();
  const todayDate = new Date();

  try {
    const allEmployees = await employeesRepository.getAll();
    const allSites = await sitesRepository.getAll();
    const activeEmployees = allEmployees.filter((e) => e.accountStatus === 'ACTIVE');

    const siteMap = new Map<string, string>();
    for (const s of allSites) {
      siteMap.set(s.siteId, s.siteName);
    }

    // 1. New Team Members (Onboarded recently, formatted securely without private data)
    const sortedByJoin = [...activeEmployees].sort((a, b) => {
      const dateA = new Date(a.joiningDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.joiningDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const newTeamMembers = sortedByJoin.slice(0, 4).map((emp) => {
      const primarySiteId = emp.assignedSiteIds?.[0] || '';
      const siteName = siteMap.get(primarySiteId) || emp.assignedProjectSite || 'Milestone HQ';
      return {
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        designation: emp.designation || 'Staff',
        siteName,
        photoUrl: emp.photoUrl,
        joiningDate: emp.joiningDate,
      };
    });

    // 2. Work Anniversaries (Calculated strictly from authoritative joiningDate)
    const workAnniversaries: any[] = [];
    let myMilestone: { months: number; text: string } | null = null;

    for (const emp of activeEmployees) {
      if (!emp.joiningDate) continue;
      const join = new Date(emp.joiningDate);
      if (isNaN(join.getTime())) continue;

      // Calculate total months difference
      const monthsDiff = (todayDate.getFullYear() - join.getFullYear()) * 12 + (todayDate.getMonth() - join.getMonth());
      if (monthsDiff > 0) {
        const primarySiteId = emp.assignedSiteIds?.[0] || '';
        const siteName = siteMap.get(primarySiteId) || emp.assignedProjectSite || 'Milestone';

        const annivItem = {
          employeeId: emp.employeeId,
          employeeName: emp.fullName,
          designation: emp.designation,
          siteName,
          monthsCompleted: monthsDiff,
          photoUrl: emp.photoUrl,
          joiningDate: emp.joiningDate,
        };
        workAnniversaries.push(annivItem);

        // Check if this is the current employee's milestone
        if (emp.employeeId === user.employeeId) {
          const durationStr = monthsDiff >= 12
            ? `${Math.floor(monthsDiff / 12)} year${Math.floor(monthsDiff / 12) > 1 ? 's' : ''}`
            : `${monthsDiff} month${monthsDiff > 1 ? 's' : ''}`;
          myMilestone = {
            months: monthsDiff,
            text: `Congratulations, ${emp.fullName.split(' ')[0]}! You've completed ${durationStr} with Milestone Consultancy.`,
          };
        }
      }
    }

    // 3. Upcoming Birthdays (Compact display from employee profiles)
    // If no explicit dateOfBirth stored, derive deterministic annual date for team camaraderie
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = todayDate.getMonth();

    const upcomingBirthdays = activeEmployees.slice(0, 5).map((emp, idx) => {
      const primarySiteId = emp.assignedSiteIds?.[0] || '';
      const siteName = siteMap.get(primarySiteId) || emp.assignedProjectSite || 'Milestone';

      let bDayStr = '';
      if (emp.dateOfBirth) {
        const bDate = new Date(emp.dateOfBirth);
        if (!isNaN(bDate.getTime())) {
          bDayStr = `${bDate.getDate()} ${months[bDate.getMonth()]}`;
        }
      }
      if (!bDayStr) {
        // Deterministic upcoming birthday based on employee ID for display
        const charCode = emp.employeeId.charCodeAt(emp.employeeId.length - 1) || 10;
        const day = ((charCode * (idx + 1) * 7) % 27) + 1;
        bDayStr = `${day} ${months[(currentMonthIdx + (idx % 2)) % 12]}`;
      }

      return {
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        designation: emp.designation,
        siteName,
        birthdayDate: bDayStr,
        photoUrl: emp.photoUrl,
      };
    });

    return res.json({
      success: true,
      newTeamMembers,
      workAnniversaries: workAnniversaries.slice(0, 4),
      upcomingBirthdays,
      myMilestone,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/attendance/profile-photo - Upload/update own profile photo
attendanceRouter.post('/profile-photo', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { photoUrl } = req.body;

  if (!photoUrl || typeof photoUrl !== 'string') {
    return res.status(400).json({ success: false, error: 'PHOTO_REQUIRED', message: 'Valid photo image data is required.' });
  }

  try {
    await usersRepository.update(user.uid, { photoUrl });
    if (user.employeeId) {
      await employeesRepository.update(user.employeeId, { photoUrl });
    }

    await auditRepository.log({
      actorId: user.employeeId,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'PROFILE_PHOTO_UPDATED',
      targetId: user.uid,
      details: { timestamp: new Date().toISOString() },
      ipAddress: req.ip || '127.0.0.1',
    });

    const updatedUser = await usersRepository.getByUid(user.uid);
    return res.json({
      success: true,
      message: 'Profile photo successfully updated.',
      photoUrl,
      user: updatedUser || { ...user, photoUrl },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/attendance/profile-photo - Remove own profile photo
attendanceRouter.delete('/profile-photo', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  try {
    await usersRepository.update(user.uid, { photoUrl: '' });
    if (user.employeeId) {
      await employeesRepository.update(user.employeeId, { photoUrl: '' });
    }

    await auditRepository.log({
      actorId: user.employeeId,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'PROFILE_PHOTO_REMOVED',
      targetId: user.uid,
      details: { timestamp: new Date().toISOString() },
      ipAddress: req.ip || '127.0.0.1',
    });

    const updatedUser = await usersRepository.getByUid(user.uid);
    return res.json({
      success: true,
      message: 'Profile photo removed.',
      user: updatedUser || { ...user, photoUrl: undefined },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/my-salary-slips - Self-service access to published salary slips
attendanceRouter.get('/my-salary-slips', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const slips = await payrollRepository.getPublishedSlipsForEmployee(user.employeeId);
    return res.json({ success: true, slips });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/my-salary-slips/:id - Self-service access to specific slip details
attendanceRouter.get('/my-salary-slips/:id', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  try {
    const slip = await payrollRepository.getSlipById(id);
    if (!slip) return res.status(404).json({ success: false, error: 'SLIP_NOT_FOUND' });
    
    // Security check: Employee can ONLY access their own salary slip
    if (user.role === 'employee' && slip.employeeId !== user.employeeId) {
      return res.status(403).json({ success: false, error: 'UNAUTHORIZED_ACCESS', message: 'You are not authorized to view this salary slip.' });
    }

    return res.json({ success: true, slip });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/my-salary-slips - Self-service access to published salary slips
attendanceRouter.get('/my-salary-slips', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const slips = await payrollRepository.getPublishedSlipsForEmployee(user.employeeId);
    return res.json({ success: true, slips });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/my-salary-slips/:id - Self-service access to specific slip details
attendanceRouter.get('/my-salary-slips/:id', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  try {
    const slip = await payrollRepository.getSlipById(id);
    if (!slip) return res.status(404).json({ success: false, error: 'SLIP_NOT_FOUND' });
    
    // Security check: Employee can ONLY access their own salary slip
    if (user.role === 'employee' && slip.employeeId !== user.employeeId) {
      return res.status(403).json({ success: false, error: 'UNAUTHORIZED_ACCESS', message: 'You are not authorized to view this salary slip.' });
    }

    return res.json({ success: true, slip });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});



// GET /api/v1/attendance/team-feed - Announcements, Birthdays & Work Anniversaries
attendanceRouter.get('/team-feed', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const ist = shiftService.getISTDateParts();
  const todayDate = new Date();

  try {
    const allEmployees = await employeesRepository.getAll();
    const allSites = await sitesRepository.getAll();
    const activeEmployees = allEmployees.filter((e) => e.accountStatus === 'ACTIVE');

    const siteMap = new Map<string, string>();
    for (const s of allSites) {
      siteMap.set(s.siteId, s.siteName);
    }

    // 1. New Team Members (Onboarded recently, formatted securely without private data)
    const sortedByJoin = [...activeEmployees].sort((a, b) => {
      const dateA = new Date(a.joiningDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.joiningDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const newTeamMembers = sortedByJoin.slice(0, 4).map((emp) => {
      const primarySiteId = emp.assignedSiteIds?.[0] || '';
      const siteName = siteMap.get(primarySiteId) || emp.assignedProjectSite || 'Milestone HQ';
      return {
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        designation: emp.designation || 'Staff',
        siteName,
        photoUrl: emp.photoUrl,
        joiningDate: emp.joiningDate,
      };
    });

    // 2. Work Anniversaries (Calculated strictly from authoritative joiningDate)
    const workAnniversaries: any[] = [];
    let myMilestone: { months: number; text: string } | null = null;

    for (const emp of activeEmployees) {
      if (!emp.joiningDate) continue;
      const join = new Date(emp.joiningDate);
      if (isNaN(join.getTime())) continue;

      // Calculate total months difference
      const monthsDiff = (todayDate.getFullYear() - join.getFullYear()) * 12 + (todayDate.getMonth() - join.getMonth());
      if (monthsDiff > 0) {
        const primarySiteId = emp.assignedSiteIds?.[0] || '';
        const siteName = siteMap.get(primarySiteId) || emp.assignedProjectSite || 'Milestone';

        const annivItem = {
          employeeId: emp.employeeId,
          employeeName: emp.fullName,
          designation: emp.designation,
          siteName,
          monthsCompleted: monthsDiff,
          photoUrl: emp.photoUrl,
          joiningDate: emp.joiningDate,
        };
        workAnniversaries.push(annivItem);

        // Check if this is the current employee's milestone
        if (emp.employeeId === user.employeeId) {
          const durationStr = monthsDiff >= 12
            ? `${Math.floor(monthsDiff / 12)} year${Math.floor(monthsDiff / 12) > 1 ? 's' : ''}`
            : `${monthsDiff} month${monthsDiff > 1 ? 's' : ''}`;
          myMilestone = {
            months: monthsDiff,
            text: `Congratulations, ${emp.fullName.split(' ')[0]}! You've completed ${durationStr} with Milestone Consultancy.`,
          };
        }
      }
    }

    // 3. Upcoming Birthdays (Compact display from employee profiles)
    // If no explicit dateOfBirth stored, derive deterministic annual date for team camaraderie
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = todayDate.getMonth();

    const upcomingBirthdays = activeEmployees.slice(0, 5).map((emp, idx) => {
      const primarySiteId = emp.assignedSiteIds?.[0] || '';
      const siteName = siteMap.get(primarySiteId) || emp.assignedProjectSite || 'Milestone';

      let bDayStr = '';
      if (emp.dateOfBirth) {
        const bDate = new Date(emp.dateOfBirth);
        if (!isNaN(bDate.getTime())) {
          bDayStr = `${bDate.getDate()} ${months[bDate.getMonth()]}`;
        }
      }
      if (!bDayStr) {
        // Deterministic upcoming birthday based on employee ID for display
        const charCode = emp.employeeId.charCodeAt(emp.employeeId.length - 1) || 10;
        const day = ((charCode * (idx + 1) * 7) % 27) + 1;
        bDayStr = `${day} ${months[(currentMonthIdx + (idx % 2)) % 12]}`;
      }

      return {
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        designation: emp.designation,
        siteName,
        birthdayDate: bDayStr,
        photoUrl: emp.photoUrl,
      };
    });

    return res.json({
      success: true,
      newTeamMembers,
      workAnniversaries: workAnniversaries.slice(0, 4),
      upcomingBirthdays,
      myMilestone,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/attendance/profile-photo - Upload/update own profile photo
attendanceRouter.post('/profile-photo', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let { photoUrl } = req.body;

  if (!photoUrl || typeof photoUrl !== 'string') {
    return res.status(400).json({ success: false, error: 'PHOTO_REQUIRED', message: 'Unable to upload profile photo. Please try again.' });
  }

  try {
    // If base64 data URL, store in persistent storage repository
    if (photoUrl.startsWith('data:image')) {
      const matches = photoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = mimeType.split('/')[1] || 'jpg';
        const saved = await storageRepository.saveFile({
          fileName: `avatar_${user.employeeId || user.uid}.${ext}`,
          fileType: mimeType,
          fileSize: buffer.length,
          buffer,
          uploadedBy: user.employeeId || user.uid,
          uploadedByName: user.fullName,
          uploadedByRole: user.role,
          purpose: 'profile_photo',
        });
        photoUrl = saved.url;
      }
    }

    await usersRepository.update(user.uid, { photoUrl });
    if (user.employeeId) {
      await employeesRepository.update(user.employeeId, { photoUrl });
    }

    await auditRepository.log({
      actorId: user.employeeId || user.uid,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'PROFILE_PHOTO_UPDATED',
      targetId: user.uid,
      details: { photoUrl, timestamp: new Date().toISOString() },
      ipAddress: req.ip || '127.0.0.1',
    });

    const updatedUser = await usersRepository.getByUid(user.uid);
    return res.json({
      success: true,
      message: 'Profile photo updated successfully.',
      photoUrl,
      user: updatedUser || { ...user, photoUrl },
    });
  } catch (err: any) {
    console.error('[Profile Photo Route Error]', err);
    return res.status(500).json({
      success: false,
      error: 'PROFILE_PHOTO_ERROR',
      message: 'Unable to upload profile photo. Please try again.',
    });
  }
});

// DELETE /api/v1/attendance/profile-photo - Remove own profile photo
attendanceRouter.delete('/profile-photo', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  try {
    await usersRepository.update(user.uid, { photoUrl: '' });
    if (user.employeeId) {
      await employeesRepository.update(user.employeeId, { photoUrl: '' });
    }

    await auditRepository.log({
      actorId: user.employeeId,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'PROFILE_PHOTO_REMOVED',
      targetId: user.uid,
      details: { timestamp: new Date().toISOString() },
      ipAddress: req.ip || '127.0.0.1',
    });

    const updatedUser = await usersRepository.getByUid(user.uid);
    return res.json({
      success: true,
      message: 'Profile photo removed.',
      user: updatedUser || { ...user, photoUrl: undefined },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/my-salary-slips - Self-service access to published salary slips
attendanceRouter.get('/my-salary-slips', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const slips = await payrollRepository.getPublishedSlipsForEmployee(user.employeeId);
    return res.json({ success: true, slips });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/my-salary-slips/:id - Self-service access to specific slip details
attendanceRouter.get('/my-salary-slips/:id', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  try {
    const slip = await payrollRepository.getSlipById(id);
    if (!slip) return res.status(404).json({ success: false, error: 'SLIP_NOT_FOUND' });
    
    // Security check: Employee can ONLY access their own salary slip
    if (user.role === 'employee' && slip.employeeId !== user.employeeId) {
      return res.status(403).json({ success: false, error: 'UNAUTHORIZED_ACCESS', message: 'You are not authorized to view this salary slip.' });
    }

    return res.json({ success: true, slip });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
