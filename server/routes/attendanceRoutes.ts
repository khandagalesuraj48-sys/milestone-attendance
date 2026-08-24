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
import { auditRepository } from '../repositories/auditRepository';
import { usersRepository } from '../repositories/usersRepository';
import { storageRepository } from '../repositories/storageRepository';
import { deviceResetRequestsRepository } from '../repositories/deviceResetRequestsRepository';
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
      attendance: result.record,
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
  const { latitude, longitude, accuracy, installationKey } = req.body;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'MISSING_PARAMETERS',
      message: 'latitude and longitude are required for punch out.',
    });
  }

  try {
    const result = await attendanceService.punchOut({
      user,
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
      attendance: result.record,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: 'PUNCH_OUT_REJECTED',
      message: err.message || 'Punch out failed validation.',
    });
  }
});

// GET /api/v1/attendance/my-today - Current day attendance & session state
attendanceRouter.get('/my-today', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const status = await attendanceService.getCurrentStatus(user.employeeId);
    return res.json({
      success: true,
      ...status,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/attendance/my-history - Attendance history
attendanceRouter.get('/my-history', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { startDate, endDate, month } = req.query;
  const ist = shiftService.getISTDateParts();

  let effStart: string;
  let effEnd: string;

  if (startDate && endDate) {
    effStart = String(startDate);
    effEnd = String(endDate);
  } else if (month) {
    effStart = `${month}-01`;
    effEnd = `${month}-31`;
  } else {
    effStart = `${ist.yearMonth}-01`;
    effEnd = `${ist.yearMonth}-31`;
  }

  try {
    const records = await attendanceRepository.queryRecords({
      employeeId: user.employeeId,
      startDate: effStart,
      endDate: effEnd,
    });

    return res.json({
      success: true,
      records,
      period: { startDate: effStart, endDate: effEnd },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// LEAVES ENDPOINTS (Employee self-service)
attendanceRouter.get('/my-leaves', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const leaves = await leavesRepository.getByEmployeeId(user.employeeId);
    return res.json({ success: true, leaves });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

attendanceRouter.post('/my-leaves', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { leaveType, startDate, endDate, reason, attachmentDataUrl, attachmentName, attachmentType, attachmentSize } = req.body;

  if (!leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'leaveType, startDate, endDate, and reason are required.',
    });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_DATES',
        message: 'End date cannot be earlier than start date.',
      });
    }

    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const leaveId = `leave_${user.employeeId}_${Date.now()}`;

    let savedAttachmentUrl = null;
    let savedAttachmentId = null;

    if (attachmentDataUrl && typeof attachmentDataUrl === 'string' && attachmentDataUrl.startsWith('data:')) {
      try {
        const matches = attachmentDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const ext = mimeType.split('/')[1] || 'bin';
          const savedFile = await storageRepository.saveFile({
            fileName: attachmentName || `leave_doc_${leaveId}.${ext}`,
            fileType: mimeType,
            fileSize: buffer.length,
            buffer,
            uploadedBy: user.employeeId,
            uploadedByName: user.fullName,
            uploadedByRole: user.role,
            purpose: 'leave_attachment',
          });
          savedAttachmentUrl = savedFile.url;
          savedAttachmentId = savedFile.id;
        }
      } catch (uploadErr) {
        console.warn('Leave document storage notice:', uploadErr);
      }
    }

    const newLeave: LeaveRecord = {
      id: leaveId,
      employeeId: user.employeeId,
      employeeName: user.fullName,
      department: user.department || 'General',
      leaveType,
      startDate,
      endDate,
      totalDays: diffDays,
      reason: String(reason).trim(),
      status: 'PENDING',
      attachmentUrl: savedAttachmentUrl,
      attachmentName: attachmentName || null,
      attachmentType: attachmentType || null,
      attachmentSize: attachmentSize || null,
      attachmentId: savedAttachmentId,
      paidDays: 0,
      unpaidDays: 0,
      reviewedByAdminId: null,
      reviewComment: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
    };

    await leavesRepository.create(newLeave);

    await auditRepository.log({
      actorId: user.employeeId,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'LEAVE_REQUESTED',
      targetId: leaveId,
      details: { leaveType, startDate, endDate, totalDays: diffDays },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully.',
      leave: newLeave,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

attendanceRouter.get('/my-leave-balance', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const balance = await leaveLedgerRepository.getBalance(user.employeeId);
    const ledger = await leaveLedgerRepository.getLedger(user.employeeId);
    return res.json({
      success: true,
      balance: balance || {
        employeeId: user.employeeId,
        openingBalance: 0,
        monthlyEntitlement: 2,
        carryForward: 0,
        paidUsed: 0,
        paidRemaining: 0,
        approvedUnpaid: 0,
        creditedMonths: [],
        updatedAt: new Date().toISOString(),
      },
      ledger,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// REGULARIZATION ENDPOINTS
attendanceRouter.get('/my-regularize', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const requests = await regularizationRepository.getByEmployeeId(user.employeeId);
    return res.json({ success: true, requests });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

attendanceRouter.post('/my-regularize', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { attendanceDate, shiftType, requestedSignInTime, requestedSignOutTime, reason, attendanceRecordId } = req.body;

  if (!attendanceDate || !shiftType || !requestedSignInTime || !requestedSignOutTime || !reason) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'attendanceDate, shiftType, requestedSignInTime, requestedSignOutTime, and reason are required.',
    });
  }

  try {
    const regId = `reg_${user.employeeId}_${attendanceDate}_${Date.now()}`;
    const newReq: AttendanceRegularizationRequest = {
      id: regId,
      employeeId: user.employeeId,
      employeeName: user.fullName,
      department: user.department || 'General',
      attendanceRecordId: attendanceRecordId || null,
      attendanceDate,
      shiftType,
      requestedSignInTime,
      requestedSignOutTime,
      reason: String(reason).trim(),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    await regularizationRepository.create(newReq);

    await auditRepository.log({
      actorId: user.employeeId,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'REGULARIZATION_REQUESTED',
      targetId: regId,
      details: { attendanceDate, shiftType, reason },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.status(201).json({
      success: true,
      message: 'Attendance regularization request submitted.',
      request: newReq,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// NOTIFICATIONS
attendanceRouter.get('/notifications', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const list = await notificationsRepository.getByEmployeeId(user.employeeId);
    return res.json({ success: true, notifications: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

attendanceRouter.post('/notifications/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  try {
    await notificationsRepository.markAsRead(id, user.employeeId);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

attendanceRouter.post('/notifications/mark-all-read', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    await notificationsRepository.markAllAsRead(user.employeeId);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /my-profile
attendanceRouter.get('/my-profile', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const employee = user.employeeId ? await employeesRepository.getById(user.employeeId) : null;
    const allSites = await sitesRepository.getAll();
    const assignedSites = allSites.filter((s) => (employee?.assignedSiteIds || []).includes(s.siteId));
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

// DEVICE RESET REQUEST
attendanceRouter.get('/my-device-info', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const devices = await devicesRepository.getByEmployeeId(user.employeeId);
    const active = devices.find((d) => d.status === 'ACTIVE');
    return res.json({
      success: true,
      isBound: !!active,
      device: active || null,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

attendanceRouter.post('/request-device-reset', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { reason } = req.body;

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ success: false, error: 'REASON_REQUIRED', message: 'Reason for hardware reset is required.' });
  }

  try {
    const reqId = `drr_${user.employeeId}_${Date.now()}`;
    await deviceResetRequestsRepository.create({
      id: reqId,
      employeeId: user.employeeId,
      employeeName: user.fullName,
      department: user.department || 'General',
      designation: user.designation || 'Staff',
      reason: String(reason).trim(),
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await auditRepository.log({
      actorId: user.employeeId,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'DEVICE_RESET_REQUESTED',
      targetId: reqId,
      details: { reason },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: 'Hardware device reset request submitted to administration for review.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PROFILE PHOTO MANAGEMENT
attendanceRouter.post('/profile-photo', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  let { photoUrl } = req.body;

  if (!photoUrl || typeof photoUrl !== 'string') {
    return res.status(400).json({ success: false, error: 'PHOTO_REQUIRED', message: 'Valid photo image data is required.' });
  }

  try {
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
    return res.status(500).json({ success: false, error: err.message });
  }
});

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
