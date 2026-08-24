import { Router, Response } from 'express';
import { adminAuth } from '../firebaseAdmin';
import { requireAuth, requirePasswordUpdated, requireRole, AuthenticatedRequest } from '../auth';
import { usersRepository } from '../repositories/usersRepository';
import { employeesRepository } from '../repositories/employeesRepository';
import { sitesRepository } from '../repositories/sitesRepository';
import { locationsRepository } from '../repositories/locationsRepository';
import { devicesRepository } from '../repositories/devicesRepository';
import { attendanceRepository } from '../repositories/attendanceRepository';
import { leavesRepository } from '../repositories/leavesRepository';
import { leaveLedgerRepository } from '../repositories/leaveLedgerRepository';
import { regularizationRepository } from '../repositories/regularizationRepository';
import { notificationsRepository } from '../repositories/notificationsRepository';
import { policyRepository } from '../repositories/policyRepository';
import { securityRepository } from '../repositories/securityRepository';
import { auditRepository } from '../repositories/auditRepository';
import { masterRegisterRepository } from '../repositories/masterRegisterRepository';
import { deviceResetRequestsRepository } from '../repositories/deviceResetRequestsRepository';
import { deviceService } from '../services/deviceService';
import { shiftService } from '../services/shiftService';
import { resetService } from '../services/resetService';
import { schedulerService } from '../services/schedulerService';
import {
  Site,
  LocationSite,
  Employee,
  AttendanceCorrection,
  MasterRegisterEntry,
  MasterRegisterSummary,
  MasterRegisterStatus,
  DayWiseAttendanceEntry,
} from '../../src/types';

export const adminRouter = Router();

// Protect all admin routes
adminRouter.use(requireAuth);
adminRouter.use(requirePasswordUpdated);
adminRouter.use(requireRole(['admin']));

// GET /api/v1/admin/overview - Executive summary with multi-site breakdowns and filters
adminRouter.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  const ist = shiftService.getISTDateParts();
  const { date, siteId, locationId, department } = req.query;
  const targetDate = date ? String(date) : ist.dateStr;

  try {
    const allEmployees = await employeesRepository.getAll();
    const allSites = await sitesRepository.getAll();
    const allLocations = await locationsRepository.getAll();
    const allUsers = await usersRepository.getAll();
    const allRecords = await attendanceRepository.queryRecords({ date: targetDate });

    // Filter employees based on active filters
    let filteredEmployees = allEmployees;
    if (department && department !== 'ALL') {
      filteredEmployees = filteredEmployees.filter((e) => e.department === department);
    }
    if (siteId && siteId !== 'ALL') {
      filteredEmployees = filteredEmployees.filter((e) => (e.assignedSiteIds || []).includes(String(siteId)));
    }
    if (locationId && locationId !== 'ALL') {
      filteredEmployees = filteredEmployees.filter(
        (e) => !e.assignedLocationIds || e.assignedLocationIds.length === 0 || e.assignedLocationIds.includes(String(locationId))
      );
    }

    // Filter attendance records based on active filters
    let filteredRecords = allRecords;
    if (siteId && siteId !== 'ALL') {
      filteredRecords = filteredRecords.filter((r) => r.siteId === siteId);
    }
    if (locationId && locationId !== 'ALL') {
      filteredRecords = filteredRecords.filter((r) => r.locationId === locationId);
    }
    if (department && department !== 'ALL') {
      filteredRecords = filteredRecords.filter((r) => {
        const emp = allEmployees.find((e) => e.employeeId === r.employeeId);
        return emp?.department === department;
      });
    }

    const totalActive = filteredEmployees.filter((e) => e.accountStatus === 'ACTIVE').length;
    const currentlySignedIn = filteredRecords.filter((r) => r.attendanceState === 'SIGNED_IN').length;
    const completedToday = filteredRecords.filter((r) => r.attendanceState === 'SIGNED_OUT' || r.attendanceState === 'AUTO_SIGNED_OUT').length;
    const presentToday = filteredRecords.filter((r) => r.attendanceStatus === 'PRESENT_FULL_DAY' || r.attendanceStatus === 'PRESENT_HALF_DAY').length;
    const absentToday = Math.max(0, totalActive - presentToday);
    const lateArrivals = filteredRecords.filter((r) => r.isLate).length;
    const autoSignedOutCount = filteredRecords.filter((r) => r.attendanceState === 'AUTO_SIGNED_OUT').length;

    // Multi-site live breakdown
    const siteBreakdown = allSites.map((s) => {
      const siteRecords = allRecords.filter((r) => r.siteId === s.siteId);
      const siteEmployees = allEmployees.filter((e) => (e.assignedSiteIds || []).includes(s.siteId) && e.accountStatus === 'ACTIVE');
      return {
        siteId: s.siteId,
        siteName: s.siteName,
        totalAssigned: siteEmployees.length,
        currentlySignedIn: siteRecords.filter((r) => r.attendanceState === 'SIGNED_IN').length,
        presentCount: siteRecords.filter((r) => r.attendanceStatus === 'PRESENT_FULL_DAY' || r.attendanceStatus === 'PRESENT_HALF_DAY').length,
        lateCount: siteRecords.filter((r) => r.isLate).length,
      };
    });

    const recentRecords = [...filteredRecords]
      .sort((a, b) => new Date(b.signInTime || b.createdAt).getTime() - new Date(a.signInTime || a.createdAt).getTime())
      .slice(0, 15);

    const pendingLeaves = await leavesRepository.getPending();
    const pendingRegularizations = await regularizationRepository.getPending();
    const pendingDeviceResets = await deviceResetRequestsRepository.getPending();
    const securityEvents = await securityRepository.getRecent(10);

    const statsPayload = {
      totalEmployees: allEmployees.length,
      activeEmployees: totalActive,
      totalSites: allSites.length,
      totalLocations: allLocations.length,
      currentlySignedIn,
      completedToday,
      presentToday,
      absentToday,
      lateArrivals,
      autoSignedOutCount,
      pendingLeavesCount: pendingLeaves.length,
      pendingRegularizationsCount: pendingRegularizations.length,
      pendingDeviceResetsCount: pendingDeviceResets.length,
    };

    return res.json({
      success: true,
      stats: statsPayload,
      summary: statsPayload,
      siteBreakdown,
      siteBreakdowns: siteBreakdown,
      recentRecords,
      todayRecords: filteredRecords,
      allEmployees,
      allSites,
      allLocations,
      securityEvents,
      date: targetDate,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/admin/employees - Full employee roster with hardware bindings
adminRouter.get('/employees', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const employees = await employeesRepository.getAll();
    const devices = await devicesRepository.getAll();
    const devMap = new Map(devices.filter((d) => d.status === 'ACTIVE' || d.status === 'APPROVED').map((d) => [d.employeeId, d.deviceSignature || d.deviceId]));

    const enriched = employees.map((emp) => ({
      ...emp,
      boundHardwareSignature: devMap.get(emp.employeeId) || emp.boundHardwareSignature || null,
      activeDeviceId: devMap.get(emp.employeeId) ? 'BOUND' : null,
    }));

    return res.json({ success: true, employees: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/employees - Create new employee & provision Firebase Auth
adminRouter.post('/employees', async (req: AuthenticatedRequest, res: Response) => {
  const {
    employeeId,
    username,
    fullName,
    mobile,
    email,
    department,
    designation,
    assignedSiteIds,
    assignedLocationIds,
    assignedProjectSite,
    joiningDate,
    dateOfBirth,
    tempPassword,
    mustChangePassword,
  } = req.body;

  if (!employeeId || !username || !fullName || !mobile || !email || !department || !designation || !tempPassword) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'employeeId, username, fullName, mobile, email, department, designation, and tempPassword are required.',
    });
  }

  const cleanEmpId = String(employeeId).trim().toUpperCase();
  const cleanUsername = String(username).trim().toLowerCase();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanMobile = String(mobile).trim();
  const cleanFullName = String(fullName).trim();

  try {
    // 1. Check if employeeId or username already exists in repository
    const existingEmp = await employeesRepository.getById(cleanEmpId);
    if (existingEmp) {
      return res.status(400).json({
        success: false,
        error: 'EMPLOYEE_EXISTS',
        message: `Employee ID ${cleanEmpId} is already registered.`,
      });
    }

    const existingUser = await usersRepository.getByUsername(cleanUsername);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'USERNAME_EXISTS',
        message: `Username '${cleanUsername}' is already taken.`,
      });
    }

    // 2. Create user in Firebase Authentication
    let uid: string;
    try {
      const authUser = await adminAuth.createUser({
        email: cleanEmail,
        password: String(tempPassword).trim(),
        displayName: cleanFullName,
      });
      uid = authUser.uid;
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-exists') {
        return res.status(400).json({
          success: false,
          error: 'EMAIL_EXISTS',
          message: `Email address '${cleanEmail}' is already registered in Firebase Authentication.`,
        });
      }
      throw authErr;
    }

    const nowIso = new Date().toISOString();

    // 3. Create User doc in users repository
    await usersRepository.create(uid, {
      uid,
      id: uid,
      employeeId: cleanEmpId,
      username: cleanUsername,
      email: cleanEmail,
      fullName: cleanFullName,
      role: 'employee',
      accountStatus: 'ACTIVE',
      mustChangePassword: mustChangePassword !== false,
      department: String(department).trim(),
      designation: String(designation).trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // 4. Create Employee profile doc
    const newEmployee: Employee = {
      employeeId: cleanEmpId,
      username: cleanUsername,
      fullName: cleanFullName,
      mobile: cleanMobile,
      email: cleanEmail,
      department: String(department).trim(),
      designation: String(designation).trim(),
      joiningDate: joiningDate || nowIso.split('T')[0],
      dateOfBirth: dateOfBirth || undefined,
      assignedSiteIds: Array.isArray(assignedSiteIds) ? assignedSiteIds : assignedProjectSite ? [assignedProjectSite] : [],
      assignedLocationIds: Array.isArray(assignedLocationIds) ? assignedLocationIds : [],
      assignedProjectSite: assignedProjectSite || (Array.isArray(assignedSiteIds) ? assignedSiteIds[0] : ''),
      accountStatus: 'ACTIVE',
      boundHardwareSignature: null,
      activeDeviceId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await employeesRepository.create(newEmployee);

    // 5. Initialize leave balance
    await leaveLedgerRepository.getBalance(cleanEmpId, cleanFullName, String(department).trim());

    // 6. Log audit event
    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'EMPLOYEE_CREATED',
      targetId: cleanEmpId,
      details: { username: cleanUsername, email: cleanEmail, department },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.status(201).json({
      success: true,
      message: `Employee ${cleanFullName} (${cleanEmpId}) created successfully.`,
      employee: newEmployee,
    });
  } catch (err: any) {
    console.error('Failed to create employee:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/admin/employees/:id - Update employee profile
adminRouter.put('/employees/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const cleanEmpId = String(id).toUpperCase().trim();
  const {
    fullName,
    mobile,
    department,
    designation,
    assignedSiteIds,
    assignedLocationIds,
    assignedProjectSite,
    accountStatus,
    joiningDate,
    dateOfBirth,
    resetHardwareBinding,
  } = req.body;

  try {
    const emp = await employeesRepository.getById(cleanEmpId);
    if (!emp) {
      return res.status(404).json({ success: false, error: 'EMPLOYEE_NOT_FOUND' });
    }

    const updates: Partial<Employee> = {
      updatedAt: new Date().toISOString(),
    };

    if (fullName) updates.fullName = String(fullName).trim();
    if (mobile) updates.mobile = String(mobile).trim();
    if (department) updates.department = String(department).trim();
    if (designation) updates.designation = String(designation).trim();
    if (assignedSiteIds !== undefined) updates.assignedSiteIds = assignedSiteIds;
    if (assignedLocationIds !== undefined) updates.assignedLocationIds = assignedLocationIds;
    if (assignedProjectSite !== undefined) updates.assignedProjectSite = assignedProjectSite;
    if (accountStatus) updates.accountStatus = accountStatus;
    if (joiningDate) updates.joiningDate = joiningDate;
    if (dateOfBirth) updates.dateOfBirth = dateOfBirth;

    if (resetHardwareBinding === true) {
      updates.boundHardwareSignature = null;
      updates.activeDeviceId = null;
      await devicesRepository.revokeAllForEmployee(cleanEmpId, req.user!.employeeId, 'Admin Manual Device Reset');
    }

    const updated = await employeesRepository.update(cleanEmpId, updates);

    // Update corresponding user profile if name/department changed
    const user = await usersRepository.getByEmployeeId(cleanEmpId);
    if (user) {
      await usersRepository.update(user.uid, {
        fullName: updates.fullName || user.fullName,
        department: updates.department || user.department,
        designation: updates.designation || user.designation,
        accountStatus: updates.accountStatus || user.accountStatus,
      });
    }

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'EMPLOYEE_UPDATED',
      targetId: cleanEmpId,
      details: updates,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: 'Employee updated successfully.',
      employee: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/admin/employees/:id - Delete employee
adminRouter.delete('/employees/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const cleanEmpId = String(id).toUpperCase().trim();

  try {
    const emp = await employeesRepository.getById(cleanEmpId);
    if (!emp) {
      return res.status(404).json({ success: false, error: 'EMPLOYEE_NOT_FOUND' });
    }

    // 1. Delete Firebase Auth user if exists
    const user = await usersRepository.getByEmployeeId(cleanEmpId);
    if (user && user.uid) {
      try {
        await adminAuth.deleteUser(user.uid);
      } catch (authErr) {
        console.warn(`Auth user delete notice for ${user.uid}:`, authErr);
      }
      await usersRepository.delete(user.uid);
    }

    // 2. Delete employee profile and device bindings
    await employeesRepository.delete(cleanEmpId);
    await devicesRepository.revokeAllForEmployee(cleanEmpId, req.user!.employeeId, 'Employee Deletion');

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'EMPLOYEE_DELETED',
      targetId: cleanEmpId,
      details: { fullName: emp.fullName },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Employee ${emp.fullName} (${cleanEmpId}) deleted successfully.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/employees/:id/toggle-status - Activate/deactivate employee
adminRouter.post('/employees/:id/toggle-status', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const cleanEmpId = String(id).toUpperCase().trim();

  try {
    const emp = await employeesRepository.getById(cleanEmpId);
    if (!emp) return res.status(404).json({ success: false, error: 'EMPLOYEE_NOT_FOUND' });

    const newStatus = emp.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await employeesRepository.update(cleanEmpId, { accountStatus: newStatus });

    const user = await usersRepository.getByEmployeeId(cleanEmpId);
    if (user) {
      await usersRepository.update(user.uid, { accountStatus: newStatus });
      if (adminAuth) {
        await adminAuth.updateUser(user.uid, { disabled: newStatus === 'INACTIVE' });
      }
    }

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'EMPLOYEE_STATUS_TOGGLED',
      targetId: cleanEmpId,
      details: { previousStatus: emp.accountStatus, newStatus },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Employee status changed to ${newStatus}.`,
      accountStatus: newStatus,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/employees/:id/reset-device - Reset hardware binding
adminRouter.post('/employees/:id/reset-device', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const cleanEmpId = String(id).toUpperCase().trim();

  try {
    const emp = await employeesRepository.getById(cleanEmpId);
    if (!emp) return res.status(404).json({ success: false, error: 'EMPLOYEE_NOT_FOUND' });

    await deviceService.resetDeviceBinding(cleanEmpId, req.user!.employeeId, 'Admin Manual Hardware Reset');

    return res.json({
      success: true,
      message: `Hardware device binding reset for ${emp.fullName}. The next device used will be bound.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/employees/:id/reset-password - Reset employee password
adminRouter.post('/employees/:id/reset-password', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { temporaryPassword } = req.body;
  const cleanEmpId = String(id).toUpperCase().trim();

  if (!temporaryPassword || String(temporaryPassword).trim().length < 6) {
    return res.status(400).json({ success: false, error: 'INVALID_PASSWORD', message: 'Temporary password must be at least 6 characters.' });
  }

  try {
    const emp = await employeesRepository.getById(cleanEmpId);
    if (!emp) return res.status(404).json({ success: false, error: 'EMPLOYEE_NOT_FOUND' });

    const user = await usersRepository.getByEmployeeId(cleanEmpId);
    if (!user) return res.status(404).json({ success: false, error: 'USER_ACCOUNT_NOT_FOUND' });

    if (adminAuth) {
      await adminAuth.updateUser(user.uid, { password: String(temporaryPassword).trim() });
    }

    await usersRepository.update(user.uid, {
      mustChangePassword: true,
      updatedAt: new Date().toISOString(),
    });

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'ADMIN_RESET_USER_PASSWORD',
      targetId: cleanEmpId,
      details: { email: user.email },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Password reset successfully for ${emp.fullName}. The employee must change it on their next login.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// SITES / PROJECTS MANAGEMENT
adminRouter.get('/sites', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const sites = await sitesRepository.getAll();
    return res.json({ success: true, sites });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/sites', async (req: AuthenticatedRequest, res: Response) => {
  const { siteId, siteName, isActive } = req.body;
  if (!siteId || !siteName) {
    return res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'siteId and siteName are required.' });
  }

  const cleanSiteId = String(siteId).trim().toUpperCase().replace(/\s+/g, '_');
  try {
    const existing = await sitesRepository.getById(cleanSiteId);
    if (existing) {
      return res.status(400).json({ success: false, error: 'SITE_EXISTS', message: `Site ID ${cleanSiteId} already exists.` });
    }

    const siteDoc: Site = {
      siteId: cleanSiteId,
      siteName: String(siteName).trim(),
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await sitesRepository.create(siteDoc);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'SITE_CREATED',
      targetId: cleanSiteId,
      details: siteDoc,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.status(201).json({ success: true, site: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.put('/sites/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { siteName, isActive } = req.body;

  try {
    const existing = await sitesRepository.getById(id);
    if (!existing) return res.status(404).json({ success: false, error: 'SITE_NOT_FOUND' });

    const updates: Partial<Site> = { updatedAt: new Date().toISOString() };
    if (siteName) updates.siteName = String(siteName).trim();
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const updated = await sitesRepository.update(id, updates);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'SITE_UPDATED',
      targetId: id,
      details: updates,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, site: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.delete('/sites/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await sitesRepository.getById(id);
    if (!existing) return res.status(404).json({ success: false, error: 'SITE_NOT_FOUND' });

    await sitesRepository.delete(id);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'SITE_DELETED',
      targetId: id,
      details: { siteName: existing.siteName },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: `Site ${existing.siteName} deleted.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Shift / Merge Site
adminRouter.post('/sites/shift-merge', async (req: AuthenticatedRequest, res: Response) => {
  const { sourceSiteId, targetSiteId, shiftEmployees, shiftLocations, deactivateSourceSiteAfterShift } = req.body;

  if (!sourceSiteId || !targetSiteId || sourceSiteId === targetSiteId) {
    return res.status(400).json({ success: false, error: 'INVALID_SITES', message: 'Distinct sourceSiteId and targetSiteId are required.' });
  }

  try {
    const source = await sitesRepository.getById(sourceSiteId);
    const target = await sitesRepository.getById(targetSiteId);
    if (!source || !target) return res.status(404).json({ success: false, error: 'SITE_NOT_FOUND' });

    let migratedEmployeesCount = 0;
    let migratedLocationsCount = 0;

    if (shiftEmployees) {
      const allEmps = await employeesRepository.getAll();
      for (const emp of allEmps) {
        if ((emp.assignedSiteIds || []).includes(sourceSiteId)) {
          const newSites = emp.assignedSiteIds.filter((s) => s !== sourceSiteId);
          if (!newSites.includes(targetSiteId)) newSites.push(targetSiteId);
          await employeesRepository.update(emp.employeeId, {
            assignedSiteIds: newSites,
            assignedProjectSite: emp.assignedProjectSite === sourceSiteId ? targetSiteId : emp.assignedProjectSite,
          });
          migratedEmployeesCount++;
        }
      }
    }

    if (shiftLocations) {
      const allLocs = await locationsRepository.getAll();
      for (const loc of allLocs) {
        if (loc.siteId === sourceSiteId) {
          await locationsRepository.update(loc.locationId, {
            siteId: targetSiteId,
            siteName: target.siteName,
          });
          migratedLocationsCount++;
        }
      }
    }

    if (deactivateSourceSiteAfterShift) {
      await sitesRepository.update(sourceSiteId, { isActive: false });
    }

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'SITE_SHIFT_MERGE',
      targetId: sourceSiteId,
      details: {
        sourceSiteId,
        targetSiteId,
        migratedEmployeesCount,
        migratedLocationsCount,
        deactivated: deactivateSourceSiteAfterShift,
      },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Shifted ${migratedEmployeesCount} employees and ${migratedLocationsCount} locations from ${source.siteName} to ${target.siteName}.`,
      migratedEmployeesCount,
      migratedLocationsCount,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// LOCATIONS & GEOFENCE RADIUS MANAGEMENT
adminRouter.get('/locations', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const locations = await locationsRepository.getAll();
    return res.json({ success: true, locations });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/locations', async (req: AuthenticatedRequest, res: Response) => {
  const { locationId, siteId, locationName, address, latitude, longitude, radiusMeters, accuracyThresholdMeters, isActive } = req.body;

  if (!siteId || !locationName || typeof latitude !== 'number' || typeof longitude !== 'number' || typeof radiusMeters !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'siteId, locationName, latitude, longitude, and radiusMeters are required.',
    });
  }

  const cleanLocId = locationId ? String(locationId).trim().toUpperCase().replace(/\s+/g, '_') : `LOC_${Date.now()}`;

  try {
    const site = await sitesRepository.getById(siteId);

    const locationDoc: LocationSite = {
      locationId: cleanLocId,
      siteId,
      siteName: site?.siteName || siteId,
      locationName: String(locationName).trim(),
      address: address ? String(address).trim() : '',
      latitude,
      longitude,
      radiusMeters,
      accuracyThresholdMeters: typeof accuracyThresholdMeters === 'number' ? accuracyThresholdMeters : 100,
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await locationsRepository.create(locationDoc);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'LOCATION_CREATED',
      targetId: cleanLocId,
      details: locationDoc,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.status(201).json({ success: true, location: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.put('/locations/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { siteId, locationName, address, latitude, longitude, radiusMeters, accuracyThresholdMeters, isActive } = req.body;

  try {
    const existing = await locationsRepository.getById(id);
    if (!existing) return res.status(404).json({ success: false, error: 'LOCATION_NOT_FOUND' });

    const updates: Partial<LocationSite> = { updatedAt: new Date().toISOString() };
    if (siteId) {
      updates.siteId = siteId;
      const site = await sitesRepository.getById(siteId);
      if (site) updates.siteName = site.siteName;
    }
    if (locationName) updates.locationName = String(locationName).trim();
    if (address !== undefined) updates.address = String(address).trim();
    if (typeof latitude === 'number') updates.latitude = latitude;
    if (typeof longitude === 'number') updates.longitude = longitude;
    if (typeof radiusMeters === 'number') updates.radiusMeters = radiusMeters;
    if (typeof accuracyThresholdMeters === 'number') updates.accuracyThresholdMeters = accuracyThresholdMeters;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const updated = await locationsRepository.update(id, updates);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'LOCATION_UPDATED',
      targetId: id,
      details: updates,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, location: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.delete('/locations/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await locationsRepository.getById(id);
    if (!existing) return res.status(404).json({ success: false, error: 'LOCATION_NOT_FOUND' });

    await locationsRepository.delete(id);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'LOCATION_DELETED',
      targetId: id,
      details: { locationName: existing.locationName },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: `Location ${existing.locationName} deleted.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// BULK ACCESS ASSIGNMENT
adminRouter.post('/access/bulk-assign', async (req: AuthenticatedRequest, res: Response) => {
  const { employeeIds, targetType, targetId, action } = req.body;

  if (!Array.isArray(employeeIds) || employeeIds.length === 0 || !targetType || !targetId || !action) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PARAMETERS',
      message: 'employeeIds array, targetType, targetId, and action (ASSIGN/REMOVE) are required.',
    });
  }

  try {
    let modifiedCount = 0;
    const cleanTargetId = String(targetId).trim();

    for (const empId of employeeIds) {
      const cleanEmpId = String(empId).toUpperCase().trim();
      const employee = await employeesRepository.getById(cleanEmpId);
      if (!employee) continue;

      if (targetType === 'PROJECT_SITE') {
        const currentSites = employee.assignedSiteIds || [];
        let newSites: string[];

        if (action === 'ASSIGN') {
          newSites = Array.from(new Set([...currentSites, cleanTargetId]));
        } else {
          newSites = currentSites.filter((id) => id !== cleanTargetId);
        }

        await employeesRepository.update(cleanEmpId, {
          assignedSiteIds: newSites,
          updatedAt: new Date().toISOString(),
        });
        modifiedCount++;
      } else if (targetType === 'LOCATION') {
        const currentLocs = employee.assignedLocationIds || [];
        let newLocs: string[];

        if (action === 'ASSIGN') {
          newLocs = Array.from(new Set([...currentLocs, cleanTargetId]));
        } else {
          newLocs = currentLocs.filter((id) => id !== cleanTargetId);
        }

        await employeesRepository.update(cleanEmpId, {
          assignedLocationIds: newLocs,
          updatedAt: new Date().toISOString(),
        });
        modifiedCount++;
      }
    }

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: `ACCESS_BULK_${action}`,
      targetId: cleanTargetId,
      details: { targetType, targetId: cleanTargetId, action, count: modifiedCount, employeeIds },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Successfully updated access for ${modifiedCount} employee(s).`,
      modifiedCount,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ATTENDANCE RECORDS QUERY & LIVE REGISTER
adminRouter.get('/attendance', async (req: AuthenticatedRequest, res: Response) => {
  const { date, startDate, endDate, employeeId, siteId, locationId, shiftType } = req.query;

  try {
    const records = await attendanceRepository.queryRecords({
      date: date ? String(date) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      employeeId: employeeId ? String(employeeId).toUpperCase() : undefined,
      siteId: siteId && siteId !== 'ALL' ? String(siteId) : undefined,
      locationId: locationId && locationId !== 'ALL' ? String(locationId) : undefined,
      shiftType: shiftType && shiftType !== 'ALL' ? (String(shiftType) as any) : undefined,
    });

    return res.json({ success: true, records });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/attendance/correct - Administrative attendance override & correction
adminRouter.post('/attendance/correct', async (req: AuthenticatedRequest, res: Response) => {
  const {
    recordId,
    newStatus,
    newSignInTime,
    newSignOutTime,
    reason,
  } = req.body;

  if (!recordId || !newStatus || !reason) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'recordId, newStatus, and administrative reason are required.',
    });
  }

  try {
    const record = await attendanceRepository.getById(recordId);
    if (!record) {
      return res.status(404).json({ success: false, error: 'RECORD_NOT_FOUND' });
    }

    const correctionId = `corr_${recordId}_${Date.now()}`;
    const correctionDoc: AttendanceCorrection = {
      id: correctionId,
      attendanceRecordId: recordId,
      employeeId: record.employeeId,
      employeeName: record.employeeNameSnapshot || record.employeeName,
      correctedByAdminId: req.user!.employeeId,
      correctedByAdminName: req.user!.fullName,
      previousAttendanceState: record.attendanceState,
      previousAttendanceStatus: record.attendanceStatus,
      previousSignInTime: record.signInTime,
      previousSignOutTime: record.signOutTime,
      newAttendanceStatus: newStatus,
      newSignInTime: newSignInTime || record.signInTime,
      newSignOutTime: newSignOutTime || record.signOutTime,
      administrativeReason: String(reason).trim(),
      createdAt: new Date().toISOString(),
    };

    // Calculate working minutes if sign in and sign out are provided
    let calculatedWorkingMinutes = record.workingMinutes;
    if (newSignInTime && newSignOutTime) {
      const start = new Date(newSignInTime).getTime();
      const end = new Date(newSignOutTime).getTime();
      if (!isNaN(start) && !isNaN(end) && end > start) {
        calculatedWorkingMinutes = Math.round((end - start) / 60000);
      }
    } else if (newStatus === 'PRESENT_FULL_DAY') {
      calculatedWorkingMinutes = Math.max(540, record.workingMinutes);
    } else if (newStatus === 'PRESENT_HALF_DAY') {
      calculatedWorkingMinutes = 240;
    } else if (newStatus === 'ABSENT') {
      calculatedWorkingMinutes = 0;
    }

    await attendanceRepository.update(recordId, {
      attendanceStatus: newStatus,
      attendanceState: newSignOutTime || newStatus === 'PRESENT_FULL_DAY' ? 'SIGNED_OUT' : record.attendanceState,
      sessionStatus: 'CLOSED',
      signInTime: newSignInTime || record.signInTime,
      signOutTime: newSignOutTime || record.signOutTime,
      workingMinutes: calculatedWorkingMinutes,
      isCorrected: true,
      activeCorrectionId: correctionId,
      adminCorrectionReason: String(reason).trim(),
      adminCorrectionBy: req.user!.fullName,
      adminCorrectionAt: new Date().toISOString(),
    });

    await attendanceRepository.saveCorrection(correctionDoc);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'ATTENDANCE_CORRECTED',
      targetId: recordId,
      details: correctionDoc,
      ipAddress: req.ip || '127.0.0.1',
    });

    const updatedRecord = await attendanceRepository.getById(recordId);

    return res.json({
      success: true,
      message: 'Attendance record successfully updated.',
      record: updatedRecord,
      correction: correctionDoc,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// LEAVES REVIEW
adminRouter.get('/leaves', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await leavesRepository.getAll();
    return res.json({ success: true, leaves: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.get('/leave-balances', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employees = await employeesRepository.getAll();
    const balances = await Promise.all(
      employees.map(async (emp) => {
        const bal = await leaveLedgerRepository.getBalance(emp.employeeId);
        return bal || {
          employeeId: emp.employeeId,
          openingBalance: 0,
          monthlyEntitlement: 2,
          carryForward: 0,
          paidUsed: 0,
          paidRemaining: 0,
          approvedUnpaid: 0,
          creditedMonths: [],
          updatedAt: new Date().toISOString(),
        };
      })
    );
    return res.json({ success: true, balances });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/leaves/:id/review', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, reviewComment } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: 'Status must be APPROVED or REJECTED.' });
  }

  try {
    const leave = await leavesRepository.getById(id);
    if (!leave) return res.status(404).json({ success: false, error: 'LEAVE_NOT_FOUND' });

    let paidDays = 0;
    let unpaidDays = 0;

    if (status === 'APPROVED') {
      const deductionResult = await leaveLedgerRepository.applyLeaveDeduction(
        leave.employeeId,
        leave.totalDays,
        id,
        `Approved leave: ${leave.startDate} to ${leave.endDate}`
      );
      paidDays = deductionResult.paidDays;
      unpaidDays = deductionResult.unpaidDays;
    }

    const updates = {
      status,
      paidDays,
      unpaidDays,
      reviewedByAdminId: req.user!.employeeId,
      reviewComment: reviewComment || null,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await leavesRepository.update(id, updates);

    // Send persistent notification to employee
    const notifTitle = status === 'APPROVED' ? 'Leave Request Approved' : 'Leave Request Rejected';
    const notifMsg =
      status === 'APPROVED'
        ? `Your leave request for ${leave.startDate} to ${leave.endDate} has been APPROVED (${paidDays} Paid, ${unpaidDays} Unpaid).`
        : `Your leave request for ${leave.startDate} to ${leave.endDate} was REJECTED. ${reviewComment ? `Reason: ${reviewComment}` : ''}`;

    await notificationsRepository.create({
      id: `notif_leave_${id}_${Date.now()}`,
      employeeId: leave.employeeId,
      type: 'LEAVE_STATUS',
      title: notifTitle,
      message: notifMsg.trim(),
      date: new Date().toISOString().split('T')[0],
      read: false,
      actionType: 'VIEW_LEAVE',
      actionPayload: { leaveId: id },
      createdAt: new Date().toISOString(),
    });

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'LEAVE_REVIEWED',
      targetId: id,
      details: { employeeId: leave.employeeId, status, paidDays, unpaidDays, comment: reviewComment },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, leave: { ...leave, ...updates } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// REGULARIZATION REVIEW
adminRouter.get('/regularize', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await regularizationRepository.getAll();
    return res.json({ success: true, requests: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/regularize/:id/review', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, reviewComment } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: 'Status must be APPROVED or REJECTED.' });
  }

  try {
    const regReq = await regularizationRepository.getById(id);
    if (!regReq) return res.status(404).json({ success: false, error: 'REQUEST_NOT_FOUND' });

    if (status === 'APPROVED') {
      const existing = await attendanceRepository.getByEmployeeAndDate(regReq.employeeId, regReq.attendanceDate);
      const targetRecord = existing.find((r) => r.shiftType === regReq.shiftType) || existing[0];

      if (targetRecord) {
        const recId = targetRecord.recordId || targetRecord.id;
        if (recId) {
          await attendanceRepository.update(recId, {
            attendanceStatus: 'PRESENT_FULL_DAY',
            attendanceState: 'SIGNED_OUT',
            sessionStatus: 'CLOSED',
            isLate: false,
            isCorrected: true,
            workingMinutes: 540,
            adminCorrectionReason: `Regularization Approved: ${regReq.reason}`,
            adminCorrectionBy: req.user!.fullName,
            adminCorrectionAt: new Date().toISOString(),
          });
        }
      } else {
        const newId = `att_reg_${regReq.employeeId}_${regReq.attendanceDate}_${Date.now()}`;
        await attendanceRepository.create({
          recordId: newId,
          id: newId,
          employeeId: regReq.employeeId,
          employeeNameSnapshot: regReq.employeeName,
          department: regReq.department,
          siteId: 'SITE_REGULARIZED',
          siteNameSnapshot: 'Regularized Attendance',
          locationId: 'LOC_REGULARIZED',
          locationNameSnapshot: 'Regularized Shift',
          shiftType: regReq.shiftType,
          attendanceDate: regReq.attendanceDate,
          businessDate: regReq.attendanceDate,
          signInTime: `${regReq.attendanceDate}T${regReq.requestedSignInTime}:00.000Z`,
          signOutTime: `${regReq.attendanceDate}T${regReq.requestedSignOutTime}:00.000Z`,
          signOutReason: 'NORMAL',
          attendanceState: 'SIGNED_OUT',
          sessionStatus: 'CLOSED',
          attendanceStatus: 'PRESENT_FULL_DAY',
          isLate: false,
          isExtraShift: false,
          extraShiftType: null,
          workingMinutes: 540,
          isCorrected: true,
          activeCorrectionId: null,
          adminCorrectionReason: `Regularization Approved: ${regReq.reason}`,
          adminCorrectionBy: req.user!.fullName,
          adminCorrectionAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const updates = {
      status,
      reviewedByAdminId: req.user!.employeeId,
      reviewedByAdminName: req.user!.fullName,
      reviewComment: reviewComment || null,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await regularizationRepository.update(id, updates);

    // Send persistent notification to employee
    const notifTitle = status === 'APPROVED' ? 'Attendance Regularized' : 'Regularization Request Rejected';
    const notifMsg =
      status === 'APPROVED'
        ? `Your attendance regularization for ${regReq.attendanceDate} (${regReq.shiftType} Shift) has been APPROVED.`
        : `Your attendance regularization for ${regReq.attendanceDate} was REJECTED. ${reviewComment ? `Reason: ${reviewComment}` : ''}`;

    await notificationsRepository.create({
      id: `notif_reg_${id}_${Date.now()}`,
      employeeId: regReq.employeeId,
      type: 'REGULARIZATION',
      title: notifTitle,
      message: notifMsg.trim(),
      date: new Date().toISOString().split('T')[0],
      read: false,
      actionType: 'VIEW_ATTENDANCE',
      actionPayload: { date: regReq.attendanceDate },
      createdAt: new Date().toISOString(),
    });

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'REGULARIZATION_REVIEWED',
      targetId: id,
      details: { employeeId: regReq.employeeId, date: regReq.attendanceDate, status, comment: reviewComment },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Regularization request successfully ${status.toLowerCase()}.`,
      request: { ...regReq, ...updates },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DEVICES & HARDWARE SECURITY
adminRouter.get('/devices', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await devicesRepository.getAll();
    return res.json({ success: true, devices: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.get('/devices/reset-requests', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await deviceResetRequestsRepository.getAll();
    return res.json({ success: true, requests: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/devices/reset-requests/:id/review', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, reviewNotes } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: 'Status must be APPROVED or REJECTED.' });
  }

  try {
    const reqDoc = await deviceResetRequestsRepository.getById(id);
    if (!reqDoc) return res.status(404).json({ success: false, error: 'REQUEST_NOT_FOUND' });

    if (status === 'APPROVED') {
      await deviceService.resetDeviceBinding(reqDoc.employeeId, req.user!.employeeId, `Reset Request Approved: ${reqDoc.reason}`);
    }

    const updates = {
      status: status as any,
      reviewedByAdminId: req.user!.employeeId,
      reviewedByAdminName: req.user!.fullName,
      reviewedAt: new Date().toISOString(),
      reviewNotes: reviewNotes || null,
      updatedAt: new Date().toISOString(),
    };

    await deviceResetRequestsRepository.update(id, updates);

    // Send notification to employee
    await notificationsRepository.create({
      id: `notif_dev_${id}_${Date.now()}`,
      employeeId: reqDoc.employeeId,
      type: 'INFO',
      title: status === 'APPROVED' ? 'Device Reset Approved' : 'Device Reset Rejected',
      message:
        status === 'APPROVED'
          ? 'Your hardware device reset request was approved. You may now log in from your new device.'
          : `Your device reset request was rejected. ${reviewNotes ? `Reason: ${reviewNotes}` : ''}`,
      date: new Date().toISOString().split('T')[0],
      read: false,
      createdAt: new Date().toISOString(),
    });

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'DEVICE_RESET_REVIEWED',
      targetId: id,
      details: { employeeId: reqDoc.employeeId, status, reviewNotes },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: `Device reset request ${status.toLowerCase()}.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// SHIFT POLICIES
adminRouter.get('/policy', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const rules = await policyRepository.getRules();
    return res.json({ success: true, rules });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.put('/policy', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const saved = await policyRepository.updateRules(req.body, req.user!.fullName);
    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'POLICY_UPDATED',
      targetId: 'attendance_rules',
      details: req.body,
      ipAddress: req.ip || '127.0.0.1',
    });
    return res.json({ success: true, rules: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// SECURITY & AUDIT
adminRouter.get('/security-events', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const events = await securityRepository.getAll();
    return res.json({ success: true, events });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.get('/audit-logs', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await auditRepository.getRecent();
    return res.json({ success: true, logs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// WORKFORCE MUSTER REPORT
adminRouter.get('/reports', async (req: AuthenticatedRequest, res: Response) => {
  const { month, startDate, endDate, department, siteId } = req.query;
  const ist = shiftService.getISTDateParts();

  let effStartDate: string;
  let effEndDate: string;

  if (startDate && endDate) {
    effStartDate = String(startDate).trim();
    effEndDate = String(endDate).trim();
  } else if (month) {
    const targetMonth = String(month).trim();
    effStartDate = `${targetMonth}-01`;
    effEndDate = `${targetMonth}-31`;
  } else {
    effStartDate = `${ist.yearMonth}-01`;
    effEndDate = `${ist.yearMonth}-31`;
  }

  try {
    let employeeList = await employeesRepository.getAll();
    if (department && department !== 'ALL') {
      employeeList = employeeList.filter((e) => e.department === String(department));
    }
    if (siteId && siteId !== 'ALL') {
      employeeList = employeeList.filter((e) => (e.assignedSiteIds || []).includes(String(siteId)));
    }

    const filteredRecords = await attendanceRepository.queryRecords({
      startDate: effStartDate,
      endDate: effEndDate,
      siteId: siteId && siteId !== 'ALL' ? String(siteId) : undefined,
    });
    const allLeaves = await leavesRepository.getAll();

    const report = employeeList.map((emp) => {
      const empRecords = filteredRecords.filter(
        (r) =>
          r.employeeId === emp.employeeId &&
          (r.businessDate || r.attendanceDate || '') >= effStartDate &&
          (r.businessDate || r.attendanceDate || '') <= effEndDate
      );

      const empLeaves = allLeaves.filter(
        (l) =>
          l.employeeId === emp.employeeId &&
          l.status === 'APPROVED' &&
          l.startDate <= effEndDate &&
          l.endDate >= effStartDate
      );

      const presentFullDays = empRecords.filter((r) => r.attendanceStatus === 'PRESENT_FULL_DAY').length;
      const presentHalfDays = empRecords.filter((r) => r.attendanceStatus === 'PRESENT_HALF_DAY').length;
      const absentDays = empRecords.filter((r) => r.attendanceStatus === 'ABSENT').length;
      const lateCount = empRecords.filter((r) => r.isLate).length;
      const extraNightCount = empRecords.filter((r) => r.isExtraShift).length;
      const totalWorkingMinutes = empRecords.reduce((acc, r) => acc + (r.workingMinutes || 0), 0);

      const approvedLeaveDays = empLeaves.reduce((acc, l) => acc + (l.totalDays || 0), 0);

      return {
        employeeId: emp.employeeId,
        fullName: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        assignedSiteIds: emp.assignedSiteIds,
        assignedProjectSite: emp.assignedProjectSite,
        presentFullDays,
        presentHalfDays,
        absentDays,
        lateCount,
        extraNightCount,
        approvedLeaveDays,
        totalWorkingMinutes,
        totalWorkingHours: +(totalWorkingMinutes / 60).toFixed(1),
        recordsCount: empRecords.length,
      };
    });

    return res.json({
      success: true,
      report,
      period: { startDate: effStartDate, endDate: effEndDate },
      totalEmployees: employeeList.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// MASTER ATTENDANCE REGISTER CRUD (Attendance Muster)
adminRouter.get('/master-register/:month', async (req: AuthenticatedRequest, res: Response) => {
  const { month } = req.params;
  try {
    const summary = await masterRegisterRepository.getByMonth(month);
    return res.json({ success: true, summary });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/master-register/generate', async (req: AuthenticatedRequest, res: Response) => {
  const { month } = req.body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ success: false, error: 'INVALID_MONTH', message: 'Month in format YYYY-MM is required.' });
  }

  try {
    const allEmployees = await employeesRepository.getAll();
    const activeEmployees = allEmployees.filter((e) => e.accountStatus === 'ACTIVE');

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const records = await attendanceRepository.queryRecords({ startDate, endDate });
    const allLeaves = await leavesRepository.getAll();

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    const entries: MasterRegisterEntry[] = activeEmployees.map((emp) => {
      const empRecords = records.filter((r) => r.employeeId === emp.employeeId);
      const empLeaves = allLeaves.filter(
        (l) => l.employeeId === emp.employeeId && l.status === 'APPROVED' && l.startDate <= endDate && l.endDate >= startDate
      );

      const presentFull = empRecords.filter((r) => r.attendanceStatus === 'PRESENT_FULL_DAY').length;
      const presentHalf = empRecords.filter((r) => r.attendanceStatus === 'PRESENT_HALF_DAY').length;
      const lateCount = empRecords.filter((r) => r.isLate).length;
      const extraNights = empRecords.filter((r) => r.isExtraShift).length;

      const paidLeaves = empLeaves.reduce((acc, l) => acc + (l.paidDays || 0), 0);
      const unpaidLeaves = empLeaves.reduce((acc, l) => acc + (l.unpaidDays || 0), 0);

      const actualPresent = presentFull + presentHalf * 0.5;
      const actualAbsent = Math.max(0, daysInMonth - actualPresent - paidLeaves - unpaidLeaves);

      const totalPayableDays = actualPresent + paidLeaves;

      return {
        id: `mre_${month}_${emp.employeeId}`,
        month,
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        siteId: emp.assignedSiteIds?.[0] || '',
        joiningDate: emp.joiningDate,
        totalDaysInMonth: daysInMonth,
        totalWorkingDays: daysInMonth - 4, // standard 4 weekly offs
        actualPresentDays: actualPresent,
        actualAbsentDays: actualAbsent,
        adminFinalPresentDays: actualPresent,
        adminFinalAbsentDays: actualAbsent,
        paidLeaves,
        unpaidLeaves,
        leaveBalance: 0,
        weeklyOffs: 4,
        lateMarksCount: lateCount,
        halfDaysCount: presentHalf,
        extraDaysCount: 0,
        extraNightsCount: extraNights,
        totalPayableDays,
        status: 'DRAFT',
      };
    });

    const summary: MasterRegisterSummary = {
      month,
      status: 'DRAFT',
      totalEmployees: entries.length,
      finalizedCount: 0,
      totalPayableDays: entries.reduce((acc, e) => acc + e.totalPayableDays, 0),
      entries,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await masterRegisterRepository.saveSummary(summary);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'MASTER_REGISTER_GENERATED',
      targetId: month,
      details: { totalEmployees: entries.length },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, summary: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// SCHEDULER TRIGGERS (Auto sign-out simulation & testing)
adminRouter.post('/scheduler/day', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await schedulerService.runDayShiftAutoSignOut();
    return res.json({
      success: true,
      worker: 'DAY_SHIFT_AUTO_SIGN_OUT_DAEMON',
      modifiedCount: result.processedCount,
      processedIds: result.recordIds,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/scheduler/night', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await schedulerService.runNightShiftAutoSignOut();
    return res.json({
      success: true,
      worker: 'NIGHT_SHIFT_AUTO_SIGN_OUT_DAEMON',
      modifiedCount: result.processedCount,
      processedIds: result.recordIds,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// SYSTEM DATA RESET
adminRouter.post('/system/reset-data', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await resetService.purgeAllData();
    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'SYSTEM_PURGED_ALL_DATA',
      targetId: 'system_root',
      details: result,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: 'All application business data and accounts successfully purged.',
      result,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
