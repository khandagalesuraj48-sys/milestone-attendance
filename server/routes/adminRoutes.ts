import { Router, Response } from 'express';
import { adminAuth, adminDb } from '../firebaseAdmin';
import { requireAuth, requirePasswordUpdated, requireRole, AuthenticatedRequest } from '../auth';
import { usersRepository } from '../repositories/usersRepository';
import { employeesRepository } from '../repositories/employeesRepository';
import { sitesRepository } from '../repositories/sitesRepository';
import { locationsRepository } from '../repositories/locationsRepository';
import { devicesRepository } from '../repositories/devicesRepository';
import { attendanceRepository } from '../repositories/attendanceRepository';
import { leavesRepository } from '../repositories/leavesRepository';
import { policyRepository } from '../repositories/policyRepository';
import { securityRepository } from '../repositories/securityRepository';
import { auditRepository } from '../repositories/auditRepository';
import { deviceService } from '../services/deviceService';
import { shiftService } from '../services/shiftService';
import { Site, LocationSite, Employee, AttendanceStatus, AttendanceCorrection } from '../../src/types';

export const adminRouter = Router();

// Protect all admin routes
adminRouter.use(requireAuth);
adminRouter.use(requirePasswordUpdated);
adminRouter.use(requireRole(['admin']));

// GET /api/v1/admin/overview - Executive summary
adminRouter.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  const ist = shiftService.getISTDateParts();
  const todayDate = ist.dateStr;

  try {
    const allEmployees = await employeesRepository.getAll();
    const activeEmployees = allEmployees.filter((e) => e.accountStatus === 'ACTIVE');
    const todayRecords = await attendanceRepository.queryRecords({ date: todayDate });
    const allSites = await sitesRepository.getAll();
    const allLocations = await locationsRepository.getAll();

    const currentlyOnDuty = todayRecords.filter((r) => r.sessionStatus === 'OPEN').length;
    const completedToday = todayRecords.filter((r) => r.sessionStatus === 'CLOSED').length;
    const lateArrivals = todayRecords.filter((r) => r.isLate).length;
    const extraNightShifts = todayRecords.filter((r) => r.isExtraShift).length;
    const autoSignedOutToday = todayRecords.filter(
      (r) => r.signOutReason === 'EMPLOYEE_FORGOT_SIGN_OUT' || r.attendanceState === 'AUTO_SIGNED_OUT'
    ).length;

    const summary = {
      totalEmployees: allEmployees.length,
      activeHeadcount: activeEmployees.length,
      currentlyOnDuty,
      completedToday,
      lateArrivals,
      extraNightShifts,
      autoSignedOutToday,
      totalSites: allSites.length,
      totalLocations: allLocations.length,
    };

    return res.json({ success: true, todayDate, summary });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/admin/sites
adminRouter.get('/sites', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sites = await sitesRepository.getAll();
    const locations = await locationsRepository.getAll();
    const employees = await employeesRepository.getAll();

    const list = sites.map((s) => ({
      ...s,
      locationsCount: locations.filter((l) => l.siteId === s.siteId).length,
      assignedEmployeesCount: employees.filter((e) => (e.assignedSiteIds || []).includes(s.siteId)).length,
    }));

    return res.json({ success: true, sites: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/sites - Create Site
adminRouter.post('/sites', async (req: AuthenticatedRequest, res: Response) => {
  const { siteId, siteName, isActive } = req.body;
  if (!siteName) {
    return res.status(400).json({ success: false, error: 'siteName is required.' });
  }

  const cleanId = siteId ? String(siteId).trim().toUpperCase() : `SITE_${Date.now()}`;
  const newSite: Site = {
    siteId: cleanId,
    siteName: String(siteName).trim(),
    isActive: isActive !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const created = await sitesRepository.create(newSite);
    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'SITE_CREATED',
      targetId: cleanId,
      details: { siteName: newSite.siteName },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, site: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/admin/sites/:id - Update Site
adminRouter.put('/sites/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { siteName, isActive } = req.body;

  try {
    const existing = await sitesRepository.getById(id);
    if (!existing) return res.status(404).json({ success: false, error: 'SITE_NOT_FOUND' });

    const updates: Partial<Site> = {};
    if (siteName) updates.siteName = String(siteName).trim();
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    await sitesRepository.update(id, updates);
    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'SITE_UPDATED',
      targetId: id,
      details: updates,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, site: { ...existing, ...updates } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/admin/locations
adminRouter.get('/locations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await locationsRepository.getAll();
    return res.json({ success: true, locations: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/locations - Create Location
adminRouter.post('/locations', async (req: AuthenticatedRequest, res: Response) => {
  const { siteId, locationName, name, address, latitude, longitude, radiusMeters, accuracyThresholdMeters } = req.body;

  if (!siteId || (!locationName && !name) || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'siteId, locationName, latitude, and longitude are required.',
    });
  }

  const site = await sitesRepository.getById(siteId);
  const locId = `loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const finalName = String(locationName || name).trim();

  const newLoc: LocationSite = {
    id: locId,
    locationId: locId,
    siteId,
    siteName: site?.siteName || siteId,
    locationName: finalName,
    name: finalName,
    address: address ? String(address).trim() : '',
    latitude,
    longitude,
    radiusMeters: typeof radiusMeters === 'number' ? radiusMeters : 200,
    accuracyThresholdMeters: typeof accuracyThresholdMeters === 'number' ? accuracyThresholdMeters : 100,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const created = await locationsRepository.create(newLoc);
    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'LOCATION_CREATED',
      targetId: locId,
      details: { locationName: finalName, siteId },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, location: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/admin/locations/:id - Update Location
adminRouter.put('/locations/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const existing = await locationsRepository.getById(id);
  if (!existing) return res.status(404).json({ success: false, error: 'LOCATION_NOT_FOUND' });

  const { siteId, locationName, name, address, latitude, longitude, radiusMeters, accuracyThresholdMeters, isActive } = req.body;
  const updates: Partial<LocationSite> = {};

  if (siteId) {
    updates.siteId = siteId;
    const site = await sitesRepository.getById(siteId);
    if (site) updates.siteName = site.siteName;
  }
  if (locationName || name) {
    const fName = String(locationName || name).trim();
    updates.locationName = fName;
    updates.name = fName;
  }
  if (address !== undefined) updates.address = String(address).trim();
  if (typeof latitude === 'number') updates.latitude = latitude;
  if (typeof longitude === 'number') updates.longitude = longitude;
  if (typeof radiusMeters === 'number') updates.radiusMeters = radiusMeters;
  if (typeof accuracyThresholdMeters === 'number') updates.accuracyThresholdMeters = accuracyThresholdMeters;
  if (typeof isActive === 'boolean') updates.isActive = isActive;

  try {
    await locationsRepository.update(id, updates);
    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'LOCATION_UPDATED',
      targetId: id,
      details: updates,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, location: { ...existing, ...updates } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/admin/employees - Directory
adminRouter.get('/employees', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employees = await employeesRepository.getAll();
    const sites = await sitesRepository.getAll();
    const users = await usersRepository.getAll();
    const devices = await devicesRepository.getByEmployeeId(''); // get helper or all

    const list = await Promise.all(
      employees.map(async (emp) => {
        const user = users.find((u) => u.employeeId === emp.employeeId);
        const activeDev = emp.activeDeviceId ? await devicesRepository.getById(emp.activeDeviceId) : null;
        return {
          ...emp,
          mustChangePassword: user?.mustChangePassword || false,
          activeDevice: activeDev || null,
          assignedSiteNames: (emp.assignedSiteIds || []).map((sId) => sites.find((s) => s.siteId === sId)?.siteName || sId),
        };
      })
    );

    return res.json({ success: true, employees: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/employees - Onboard new staff with Multi-Site assignments
adminRouter.post('/employees', async (req: AuthenticatedRequest, res: Response) => {
  const {
    employeeId,
    username,
    initialPassword,
    fullName,
    mobile,
    email,
    department,
    designation,
    joiningDate,
    assignedSiteIds,
  } = req.body;

  if (!employeeId || !username || !initialPassword || !fullName || !mobile || !email || !department || !designation) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_REQUIRED_FIELDS',
      message: 'All core employee profile fields and initial temporary password are required.',
    });
  }

  if (typeof initialPassword !== 'string' || initialPassword.trim().length < 8) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PASSWORD_LENGTH',
      message: 'Initial temporary password must be at least 8 characters long.',
    });
  }

  const cleanEmpId = String(employeeId).trim().toUpperCase();
  const cleanUsername = String(username).trim().toLowerCase();
  const cleanEmail = String(email).trim().toLowerCase();
  const passToSet = initialPassword.trim();

  try {
    // 1. Check duplicate employeeId, username, and email in Firestore & Auth before creating
    const existingEmp = await employeesRepository.getById(cleanEmpId);
    if (existingEmp) {
      return res.status(400).json({
        success: false,
        error: 'DUPLICATE_EMPLOYEE_ID',
        message: `Employee ID ${cleanEmpId} is already registered in the system.`,
      });
    }

    const existingUserByUsername = await usersRepository.getByUsername(cleanUsername);
    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        error: 'DUPLICATE_USERNAME',
        message: `Username "${cleanUsername}" is already taken.`,
      });
    }

    const existingUserByEmail = await usersRepository.getByEmail(cleanEmail);
    if (existingUserByEmail) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_EMAIL',
        message: `Email "${cleanEmail}" is already registered.`,
      });
    }

    // Multi-Site array validation
    let validSiteIds: string[] = Array.isArray(assignedSiteIds) ? assignedSiteIds : [];
    if (validSiteIds.length === 0) {
      const activeSites = await sitesRepository.getActive();
      validSiteIds = activeSites.map((s) => s.siteId);
    }

    // 2. Create Firebase Auth User
    let authUid: string;
    let isNewAuthUser = false;
    try {
      const createdAuth = await adminAuth.createUser({
        email: cleanEmail,
        password: passToSet,
        displayName: String(fullName).trim(),
      });
      authUid = createdAuth.uid;
      isNewAuthUser = true;
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-exists') {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE_EMAIL',
          message: 'This email address is already registered.',
        });
      }
      throw authErr;
    }

    try {
      await adminAuth.setCustomUserClaims(authUid, { role: 'employee', employeeId: cleanEmpId });

      // 3. Create Firestore User Document and Employee Document Atomically using a Write Batch
      const userDocRef = adminDb.collection('users').doc(authUid);
      const empDocRef = adminDb.collection('employees').doc(cleanEmpId);

      const userPayload = {
        id: authUid,
        uid: authUid,
        employeeId: cleanEmpId,
        username: cleanUsername,
        email: cleanEmail,
        fullName: String(fullName).trim(),
        role: 'employee' as const,
        mustChangePassword: true,
        accountStatus: 'ACTIVE' as const,
      };

      const nowIso = new Date().toISOString();
      const newEmp: Employee = {
        employeeId: cleanEmpId,
        username: cleanUsername,
        fullName: String(fullName).trim(),
        mobile: String(mobile).trim(),
        email: cleanEmail,
        department: String(department).trim(),
        designation: String(designation).trim(),
        joiningDate: joiningDate || shiftService.getISTDateParts().dateStr,
        accountStatus: 'ACTIVE',
        assignedSiteIds: validSiteIds,
        boundHardwareSignature: null,
        activeDeviceId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const batch = adminDb.batch();
      batch.set(userDocRef, userPayload);
      batch.set(empDocRef, newEmp);

      await batch.commit();

      // 4. Record Audit Log
      await auditRepository.log({
        actorId: req.user!.employeeId,
        actorName: req.user!.fullName,
        actorRole: 'admin',
        action: 'EMPLOYEE_CREATED',
        targetId: cleanEmpId,
        details: { employeeId: cleanEmpId, username: cleanUsername, assignedSiteIds: validSiteIds },
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.json({
        success: true,
        message: `Employee ${cleanEmpId} (${fullName}) successfully provisioned with ${validSiteIds.length} assigned site(s).`,
        employee: newEmp,
      });
    } catch (firestoreErr: any) {
      // Rollback newly created Firebase Auth account if Firestore creation fails
      let rollbackSuccess = false;
      if (isNewAuthUser && authUid) {
        try {
          await adminAuth.deleteUser(authUid);
          rollbackSuccess = true;
        } catch (cleanupErr: any) {
          try {
            await auditRepository.log({
              actorId: req.user!.employeeId,
              actorName: req.user!.fullName,
              actorRole: 'admin',
              action: 'PROVISIONING_ORPHAN_CLEANUP_FAILED',
              targetId: cleanEmpId,
              details: {
                authUid,
                employeeId: cleanEmpId,
                failureType: 'FIREBASE_AUTH_DELETE_FAILED',
                timestamp: new Date().toISOString(),
                error: cleanupErr.message || 'Unknown delete failure',
              },
              ipAddress: req.ip || '127.0.0.1',
            });
          } catch {}
        }
      }

      if (!rollbackSuccess && isNewAuthUser) {
        return res.status(500).json({
          success: false,
          error: 'PROVISIONING_FAILED_CLEANUP_REQUIRED',
          message: 'Employee provisioning failed and automated cleanup could not be completed. Administrative cleanup is required.',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'PROVISIONING_FAILED',
        message: 'Failed to write employee records to the database. The operation was safely rolled back.',
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to provision employee.' });
  }
});

// PUT /api/v1/admin/employees/:id - Update Employee & Multi-Site assignments
adminRouter.put('/employees/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const cleanId = id.toUpperCase().trim();

  try {
    const employee = await employeesRepository.getById(cleanId);
    if (!employee) return res.status(404).json({ success: false, error: 'EMPLOYEE_NOT_FOUND' });

    const { fullName, mobile, email, department, designation, assignedSiteIds, accountStatus } = req.body;
    const updates: Partial<Employee> = {};

    if (fullName) updates.fullName = String(fullName).trim();
    if (mobile) updates.mobile = String(mobile).trim();
    if (email) updates.email = String(email).trim().toLowerCase();
    if (department) updates.department = String(department).trim();
    if (designation) updates.designation = String(designation).trim();
    if (Array.isArray(assignedSiteIds)) updates.assignedSiteIds = assignedSiteIds;
    if (accountStatus && ['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(accountStatus)) {
      updates.accountStatus = accountStatus;
      const user = await usersRepository.getByEmployeeId(cleanId);
      if (user) await usersRepository.update(user.uid, { accountStatus });
    }

    await employeesRepository.update(cleanId, updates);
    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'EMPLOYEE_UPDATED',
      targetId: cleanId,
      details: updates,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, employee: { ...employee, ...updates } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/employees/:id/reset-device
adminRouter.post('/employees/:id/reset-device', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const cleanId = id.toUpperCase().trim();

  try {
    await deviceService.resetDevice(
      cleanId,
      req.user!.employeeId,
      req.user!.fullName,
      req.ip || '127.0.0.1'
    );

    return res.json({
      success: true,
      message: `Registered device for employee ${cleanId} has been reset. The employee can now bind their new approved device.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/employees/:id/reset-password - Reset password in Firebase Auth & force change
adminRouter.post('/employees/:id/reset-password', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { temporaryPassword } = req.body;
  const cleanId = id.toUpperCase().trim();

  if (!temporaryPassword || typeof temporaryPassword !== 'string' || temporaryPassword.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'TEMPORARY_PASSWORD_REQUIRED',
      message: 'A temporary password must be provided.',
    });
  }

  const cleanTempPass = temporaryPassword.trim();
  if (cleanTempPass.length < 8 || cleanTempPass.length > 128) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PASSWORD_LENGTH',
      message: 'Temporary password must be between 8 and 128 characters long.',
    });
  }

  try {
    const employee = await employeesRepository.getById(cleanId);
    if (!employee) return res.status(404).json({ success: false, error: 'EMPLOYEE_NOT_FOUND' });

    const user = await usersRepository.getByEmployeeId(cleanId);
    if (!user) return res.status(404).json({ success: false, error: 'USER_ACCOUNT_NOT_FOUND' });

    await adminAuth.updateUser(user.uid, { password: cleanTempPass });
    await usersRepository.update(user.uid, { mustChangePassword: true });

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'PASSWORD_RESET',
      targetId: cleanId,
      details: { message: 'Temporary password set in Firebase Auth; forced change enabled on next login.' },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Password for ${employee.fullName} (${cleanId}) successfully reset. Forced password change enabled.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/admin/attendance - Master register with Multi-Site filters
adminRouter.get('/attendance', async (req: AuthenticatedRequest, res: Response) => {
  const { date, employeeId, siteId, locationId, shiftType, status, isExtraShift, isAutoSignedOut } = req.query;

  try {
    const records = await attendanceRepository.queryRecords({
      date: date ? String(date) : undefined,
      employeeId: employeeId ? String(employeeId) : undefined,
      siteId: siteId ? String(siteId) : undefined,
      locationId: locationId ? String(locationId) : undefined,
      shiftType: shiftType as any,
      status: status as any,
      isExtraShift: isExtraShift === 'true' ? true : undefined,
      isAutoSignedOut: isAutoSignedOut === 'true' ? true : undefined,
    });

    return res.json({ success: true, count: records.length, records });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/attendance/:id/correct - Correct attendance with mandatory reason
adminRouter.post('/attendance/:id/correct', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newAttendanceStatus, newSignInTime, newSignOutTime, administrativeReason } = req.body;

  if (!administrativeReason || administrativeReason.trim().length < 10) {
    return res.status(400).json({
      success: false,
      error: 'REASON_REQUIRED',
      message: 'A mandatory administrative reason (minimum 10 characters) is required for all attendance corrections.',
    });
  }

  try {
    const record = await attendanceRepository.getById(id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'RECORD_NOT_FOUND' });
    }

    const correctionId = `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const correctionDoc: AttendanceCorrection = {
      id: correctionId,
      attendanceRecordId: record.recordId || record.id || id,
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      correctedByAdminId: req.user!.employeeId,
      correctedByAdminName: req.user!.fullName,
      previousAttendanceState: record.attendanceState,
      previousAttendanceStatus: record.attendanceStatus,
      previousSignInTime: record.signInTime,
      previousSignOutTime: record.signOutTime,
      newAttendanceStatus: newAttendanceStatus as AttendanceStatus,
      newSignInTime: newSignInTime || record.signInTime,
      newSignOutTime: newSignOutTime || record.signOutTime,
      administrativeReason: administrativeReason.trim(),
      createdAt: new Date().toISOString(),
    };

    await attendanceRepository.createCorrection(correctionDoc);

    const updates: Partial<typeof record> = {
      isCorrected: true,
      activeCorrectionId: correctionId,
      updatedAt: new Date().toISOString(),
    };

    if (newAttendanceStatus) updates.attendanceStatus = newAttendanceStatus;
    if (newSignInTime) updates.signInTime = newSignInTime;
    if (newSignOutTime) {
      updates.signOutTime = newSignOutTime;
      updates.sessionStatus = 'CLOSED';
      updates.attendanceState = 'SIGNED_OUT';
      updates.signOutReason = 'ADMIN_OVERRIDE';
      const start = new Date(newSignInTime || record.signInTime || '').getTime();
      const end = new Date(newSignOutTime).getTime();
      updates.workingMinutes = Math.max(0, Math.round((end - start) / 60000));
    }

    await attendanceRepository.update(record.recordId || record.id || id, updates);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'ATTENDANCE_CORRECTED',
      targetId: record.recordId || record.id || id,
      details: {
        employeeId: record.employeeId,
        oldStatus: record.attendanceStatus,
        newStatus: newAttendanceStatus,
        reason: administrativeReason,
      },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Attendance record successfully corrected to ${newAttendanceStatus}.`,
      record: { ...record, ...updates },
      correction: correctionDoc,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Policy Rules
adminRouter.get('/rules', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rules = await policyRepository.getRules();
    return res.json({ success: true, rules });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.put('/rules', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await policyRepository.updateRules(req.body, req.user!.fullName);
    return res.json({ success: true, rules: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Leaves Review
adminRouter.get('/leaves', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await leavesRepository.getAll();
    return res.json({ success: true, leaves: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.patch('/leaves/:id/review', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, reviewComment } = req.body;

  try {
    const leave = await leavesRepository.getById(id);
    if (!leave) return res.status(404).json({ success: false, error: 'LEAVE_NOT_FOUND' });

    const updates = {
      status,
      reviewComment: reviewComment || null,
      reviewedByAdminId: req.user!.employeeId,
      reviewedAt: new Date().toISOString(),
    };

    await leavesRepository.update(id, updates);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'LEAVE_REVIEWED',
      targetId: id,
      details: { employeeId: leave.employeeId, newStatus: status, comment: reviewComment },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, leave: { ...leave, ...updates } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Security Events
adminRouter.get('/security-events', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const events = await securityRepository.getAll();
    return res.json({ success: true, events });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Audit Logs
adminRouter.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await auditRepository.getRecent();
    return res.json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Holidays
adminRouter.get('/holidays', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const holidays = await policyRepository.getHolidays();
    return res.json({ success: true, holidays });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Monthly Muster Report
adminRouter.get('/reports', async (req: AuthenticatedRequest, res: Response) => {
  const { month, department } = req.query;
  const targetMonth = month ? String(month) : shiftService.getISTDateParts().yearMonth;

  try {
    let employeeList = await employeesRepository.getAll();
    if (department && department !== 'ALL') {
      employeeList = employeeList.filter((e) => e.department === String(department));
    }

    const allRecords = await attendanceRepository.queryRecords({});
    const allLeaves = await leavesRepository.getAll();

    const report = employeeList.map((emp) => {
      const empRecords = allRecords.filter(
        (r) =>
          r.employeeId === emp.employeeId &&
          (r.businessDate || r.attendanceDate || '').startsWith(targetMonth)
      );

      const empLeaves = allLeaves.filter(
        (l) =>
          l.employeeId === emp.employeeId &&
          l.status === 'APPROVED' &&
          (l.startDate.startsWith(targetMonth) || l.endDate.startsWith(targetMonth))
      );

      const presentFullDays = empRecords.filter((r) => r.attendanceStatus === 'PRESENT_FULL_DAY').length;
      const presentHalfDays = empRecords.filter((r) => r.attendanceStatus === 'PRESENT_HALF_DAY').length;
      const absentDays = empRecords.filter((r) => r.attendanceStatus === 'ABSENT').length;
      const lateCount = empRecords.filter((r) => r.isLate).length;
      const extraNightCount = empRecords.filter((r) => r.isExtraShift).length;
      const totalWorkingMinutes = empRecords.reduce((acc, r) => acc + (r.workingMinutes || 0), 0);
      const totalWorkingHours = Number((totalWorkingMinutes / 60).toFixed(1));
      const leaveDays = empLeaves.reduce((acc, l) => acc + (l.totalDays || 1), 0);

      return {
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        department: emp.department,
        month: targetMonth,
        presentFullDays,
        presentHalfDays,
        absentDays,
        lateCount,
        extraNightCount,
        leaveDays,
        totalWorkingHours,
      };
    });

    return res.json({ success: true, month: targetMonth, report });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
