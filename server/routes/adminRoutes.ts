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
import { leaveLedgerRepository } from '../repositories/leaveLedgerRepository';
import { regularizationRepository } from '../repositories/regularizationRepository';
import { notificationsRepository } from '../repositories/notificationsRepository';
import { holidaysRepository } from '../repositories/holidaysRepository';
import { policyRepository } from '../repositories/policyRepository';
import { securityRepository } from '../repositories/securityRepository';
import { auditRepository } from '../repositories/auditRepository';
import { payrollRepository } from '../repositories/payrollRepository';
import { masterRegisterRepository } from '../repositories/masterRegisterRepository';
import { deviceService } from '../services/deviceService';
import { shiftService } from '../services/shiftService';
import { payrollService, convertNumberToIndianWords } from '../services/payrollService';
import { Site, LocationSite, Employee, AttendanceStatus, AttendanceCorrection, Holiday, PayrollRun, PayrollItem, SalaryStructure, MasterRegisterEntry, MasterRegisterSummary, MasterRegisterStatus, DayWiseAttendanceEntry } from '../../src/types';

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
        return emp?.department === department || r.department === department;
      });
    }

    const activeEmployees = filteredEmployees.filter((e) => e.accountStatus === 'ACTIVE');
    const currentlyOnDuty = filteredRecords.filter(
      (r) => r.sessionStatus === 'OPEN' || r.attendanceState === 'SIGNED_IN'
    ).length;
    const completedToday = filteredRecords.filter(
      (r) => r.sessionStatus === 'CLOSED' || r.attendanceState === 'SIGNED_OUT'
    ).length;
    const lateArrivals = filteredRecords.filter((r) => r.isLate).length;
    const extraNightShifts = filteredRecords.filter((r) => r.isExtraShift).length;
    const autoSignedOutToday = filteredRecords.filter(
      (r) => r.signOutReason === 'EMPLOYEE_FORGOT_SIGN_OUT' || r.attendanceState === 'AUTO_SIGNED_OUT'
    ).length;

    // Project / Site Breakdowns
    const siteBreakdowns = allSites.map((site) => {
      const siteEmps = allEmployees.filter((e) => (e.assignedSiteIds || []).includes(site.siteId));
      const activeSiteEmps = siteEmps.filter((e) => e.accountStatus === 'ACTIVE');
      const siteRecords = allRecords.filter((r) => r.siteId === site.siteId);
      const siteWorking = siteRecords.filter(
        (r) => r.sessionStatus === 'OPEN' || r.attendanceState === 'SIGNED_IN'
      ).length;
      const siteLate = siteRecords.filter((r) => r.isLate).length;
      const siteExtra = siteRecords.filter((r) => r.isExtraShift).length;
      const siteAuto = siteRecords.filter(
        (r) => r.signOutReason === 'EMPLOYEE_FORGOT_SIGN_OUT' || r.attendanceState === 'AUTO_SIGNED_OUT'
      ).length;

      const locsForSite = allLocations.filter((l) => l.siteId === site.siteId);
      const locBreakdowns = locsForSite.map((loc) => {
        const locId = loc.locationId || loc.id;
        const locRecords = siteRecords.filter((r) => r.locationId === locId);
        const locWorking = locRecords.filter(
          (r) => r.sessionStatus === 'OPEN' || r.attendanceState === 'SIGNED_IN'
        ).length;
        const locLate = locRecords.filter((r) => r.isLate).length;
        const locExtra = locRecords.filter((r) => r.isExtraShift).length;
        const locAuto = locRecords.filter(
          (r) => r.signOutReason === 'EMPLOYEE_FORGOT_SIGN_OUT' || r.attendanceState === 'AUTO_SIGNED_OUT'
        ).length;

        return {
          locationId: locId,
          locationName: loc.locationName || loc.name,
          address: loc.address || '',
          radiusMeters: loc.radiusMeters || 200,
          accuracyThresholdMeters: loc.accuracyThresholdMeters || 100,
          isActive: loc.isActive !== false,
          latitude: loc.latitude,
          longitude: loc.longitude,
          presentToday: locRecords.length,
          workingNow: locWorking,
          lateMarks: locLate,
          extraNights: locExtra,
          autoSignedOut: locAuto,
        };
      });

      return {
        siteId: site.siteId,
        siteName: site.siteName,
        isActive: site.isActive !== false,
        totalStaff: siteEmps.length,
        activeStaff: activeSiteEmps.length,
        presentToday: siteRecords.length,
        workingNow: siteWorking,
        lateMarks: siteLate,
        extraNights: siteExtra,
        autoSignedOut: siteAuto,
        locations: locBreakdowns,
      };
    });

    const summary = {
      totalEmployees: filteredEmployees.length,
      totalStaff: filteredEmployees.length,
      activeHeadcount: activeEmployees.length,
      activeStaff: activeEmployees.length,
      presentToday: filteredRecords.length,
      presentStaff: filteredRecords.length,
      currentlyOnDuty,
      workingNow: currentlyOnDuty,
      completedToday,
      signedOut: completedToday,
      absentStaff: Math.max(0, activeEmployees.length - filteredRecords.length),
      lateArrivals,
      lateCount: lateArrivals,
      extraNightShifts,
      extraNightCount: extraNightShifts,
      autoSignedOutToday,
      autoSignedOut: autoSignedOutToday,
      totalSites: allSites.length,
      totalLocations: allLocations.length,
    };

    return res.json({
      success: true,
      todayDate: targetDate,
      summary,
      siteBreakdowns,
      todayRecords: filteredRecords,
      allEmployees: filteredEmployees.map((emp) => {
        const u = allUsers.find((user) => user.employeeId === emp.employeeId);
        return {
          ...emp,
          mustChangePassword: u?.mustChangePassword || false,
        };
      }),
      allSites,
      allLocations,
    });
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

// POST /api/v1/admin/sites/shift-merge - Shift/Merge employees and locations from one project to another
adminRouter.post('/sites/shift-merge', async (req: AuthenticatedRequest, res: Response) => {
  const { sourceSiteId, targetSiteId, shiftEmployees = true, shiftLocations = true, deactivateSourceSiteAfterShift = false } = req.body;

  if (!sourceSiteId || !targetSiteId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_SITES',
      message: 'Both sourceSiteId and targetSiteId are required for shift/merge.',
    });
  }

  if (sourceSiteId === targetSiteId) {
    return res.status(400).json({
      success: false,
      error: 'SAME_SITE',
      message: 'Source site and target site cannot be the same.',
    });
  }

  try {
    const sourceSite = await sitesRepository.getById(sourceSiteId);
    const targetSite = await sitesRepository.getById(targetSiteId);

    if (!sourceSite || !targetSite) {
      return res.status(404).json({
        success: false,
        error: 'SITE_NOT_FOUND',
        message: 'Source or target project site was not found.',
      });
    }

    let employeesShiftedCount = 0;
    let locationsShiftedCount = 0;

    // 1. Shift employees
    if (shiftEmployees) {
      const allEmployees = await employeesRepository.getAll();
      for (const emp of allEmployees) {
        if (emp.assignedSiteIds && emp.assignedSiteIds.includes(sourceSiteId)) {
          // Replace sourceSiteId with targetSiteId if not already present
          const newAssignedSiteIds = emp.assignedSiteIds.filter((sId) => sId !== sourceSiteId);
          if (!newAssignedSiteIds.includes(targetSiteId)) {
            newAssignedSiteIds.push(targetSiteId);
          }
          await employeesRepository.update(emp.employeeId, {
            assignedSiteIds: newAssignedSiteIds,
          });
          employeesShiftedCount++;
        }
      }
    }

    // 2. Shift geofence locations
    if (shiftLocations) {
      const allLocations = await locationsRepository.getAll();
      for (const loc of allLocations) {
        if (loc.siteId === sourceSiteId) {
          await locationsRepository.update(loc.locationId, {
            siteId: targetSiteId,
            siteName: targetSite.siteName,
          });
          locationsShiftedCount++;
        }
      }
    }

    // 3. Deactivate source site if requested
    if (deactivateSourceSiteAfterShift) {
      await sitesRepository.update(sourceSiteId, { isActive: false });
    }

    // 4. Audit Log
    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'PROJECT_SHIFT_MERGE',
      targetId: `${sourceSiteId}->${targetSiteId}`,
      details: {
        sourceSiteName: sourceSite.siteName,
        targetSiteName: targetSite.siteName,
        employeesShiftedCount,
        locationsShiftedCount,
        deactivateSourceSiteAfterShift,
      },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Successfully shifted ${employeesShiftedCount} employees and ${locationsShiftedCount} locations from ${sourceSite.siteName} to ${targetSite.siteName}.`,
      employeesShiftedCount,
      locationsShiftedCount,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/admin/sites/:id - Delete / Deactivate Site with Dependency Check
adminRouter.delete('/sites/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { force } = req.query;

  try {
    const site = await sitesRepository.getById(id);
    if (!site) return res.status(404).json({ success: false, error: 'SITE_NOT_FOUND' });

    // Check dependencies
    const allEmployees = await employeesRepository.getAll();
    const assignedEmps = allEmployees.filter((e) => e.assignedSiteIds && e.assignedSiteIds.includes(id));
    
    const allLocations = await locationsRepository.getAll();
    const assignedLocs = allLocations.filter((l) => l.siteId === id && l.isActive !== false);

    if ((assignedEmps.length > 0 || assignedLocs.length > 0) && force !== 'true') {
      return res.status(409).json({
        success: false,
        error: 'PROJECT_HAS_DEPENDENCIES',
        message: `Cannot delete project "${site.siteName}" directly. It has ${assignedEmps.length} assigned employee(s) and ${assignedLocs.length} active location(s). Please shift them to another project or confirm forced deactivation.`,
        assignedEmployeesCount: assignedEmps.length,
        assignedLocationsCount: assignedLocs.length,
        canForce: true,
      });
    }

    await sitesRepository.update(id, { isActive: false });

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'SITE_DEACTIVATED',
      targetId: id,
      details: { siteName: site.siteName, forced: force === 'true' },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Project site "${site.siteName}" has been successfully deactivated.`,
    });
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
    dateOfBirth,
    reportingManagerId,
    salaryStructure,
    assignedSiteIds,
  } = req.body;

  if (!employeeId || !username || !initialPassword || !fullName || !mobile || !email || !department || !designation || !joiningDate) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_REQUIRED_FIELDS',
      message: 'All core employee profile fields (including mandatory Joining Date) and initial temporary password are required.',
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

      let repManagerName: string | null = null;
      if (reportingManagerId) {
        const mgr = await employeesRepository.getById(String(reportingManagerId));
        if (mgr) repManagerName = mgr.fullName;
      }

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
        dateOfBirth: dateOfBirth ? String(dateOfBirth).trim() : undefined,
        reportingManagerId: reportingManagerId ? String(reportingManagerId).trim().toUpperCase() : null,
        reportingManagerName: repManagerName,
        salaryStructure: salaryStructure || undefined,
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

// GET /api/v1/admin/employees/:id - Retrieve single employee details
adminRouter.get('/employees/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const cleanId = id.toUpperCase().trim();

  try {
    const employee = await employeesRepository.getById(cleanId);
    if (!employee) return res.status(404).json({ success: false, error: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found.' });

    const user = await usersRepository.getByEmployeeId(cleanId);
    return res.json({
      success: true,
      employee: {
        ...employee,
        mustChangePassword: user?.mustChangePassword || false,
        username: user?.username || employee.username,
        email: user?.email || employee.email,
        role: user?.role || 'employee',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/admin/employees/:id - Authoritative Employee Update
adminRouter.put('/employees/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const cleanId = id.toUpperCase().trim();

  try {
    const existingEmployee = await employeesRepository.getById(cleanId);
    if (!existingEmployee) {
      return res.status(404).json({ success: false, error: 'EMPLOYEE_NOT_FOUND', message: 'Employee record not found.' });
    }

    const existingUser = (await usersRepository.getByEmployeeId(cleanId)) || (existingEmployee.uid ? await usersRepository.getByUid(existingEmployee.uid) : null);

    const {
      fullName,
      employeeId: newEmpIdRaw,
      email,
      username,
      mobile,
      department,
      designation,
      assignedSiteIds,
      assignedLocationIds,
      assignedProjectSite,
      accountStatus,
      joiningDate,
      dateOfBirth,
      reportingManagerId,
      salaryStructure,
    } = req.body;

    const newEmpId = newEmpIdRaw ? String(newEmpIdRaw).toUpperCase().trim() : cleanId;
    const cleanEmail = email ? String(email).toLowerCase().trim() : existingEmployee.email?.toLowerCase().trim();
    const cleanUsername = username ? String(username).toLowerCase().trim() : existingEmployee.username?.toLowerCase().trim();
    const cleanFullName = fullName ? String(fullName).trim() : existingEmployee.fullName;

    // Check if Employee ID changed and verify uniqueness
    if (newEmpId !== cleanId) {
      const duplicateEmp = await employeesRepository.getById(newEmpId);
      if (duplicateEmp) {
        return res.status(400).json({
          success: false,
          error: 'DUPLICATE_EMPLOYEE_ID',
          message: `Employee ID "${newEmpId}" is already assigned to another workforce member.`,
        });
      }
    }

    // Check Email uniqueness across users
    if (cleanEmail && cleanEmail !== existingEmployee.email?.toLowerCase().trim()) {
      const duplicateUser = await usersRepository.getByEmail(cleanEmail);
      if (duplicateUser && duplicateUser.employeeId !== cleanId && duplicateUser.uid !== existingUser?.uid) {
        return res.status(400).json({
          success: false,
          error: 'DUPLICATE_EMAIL',
          message: `Email address "${cleanEmail}" is already registered.`,
        });
      }
    }

    // Check Username uniqueness across users
    if (cleanUsername && cleanUsername !== existingEmployee.username?.toLowerCase().trim()) {
      const duplicateUsername = await usersRepository.getByUsername(cleanUsername);
      if (duplicateUsername && duplicateUsername.employeeId !== cleanId && duplicateUsername.uid !== existingUser?.uid) {
        return res.status(400).json({
          success: false,
          error: 'DUPLICATE_USERNAME',
          message: `Username "${cleanUsername}" is already taken.`,
        });
      }
    }

    // Update Firebase Auth if email or displayName changed
    if (existingUser?.uid) {
      const authUpdates: { email?: string; displayName?: string } = {};
      if (cleanEmail && cleanEmail !== existingUser.email) {
        authUpdates.email = cleanEmail;
      }
      if (cleanFullName && cleanFullName !== existingUser.fullName) {
        authUpdates.displayName = cleanFullName;
      }

      if (Object.keys(authUpdates).length > 0) {
        try {
          await adminAuth.updateUser(existingUser.uid, authUpdates);
        } catch (authErr: any) {
          console.error('Failed to sync updates to Firebase Auth user:', authErr);
        }
      }

      // Update Firestore users document
      await usersRepository.update(existingUser.uid, {
        fullName: cleanFullName,
        email: cleanEmail || existingUser.email,
        username: cleanUsername || existingUser.username,
        employeeId: newEmpId,
        accountStatus: accountStatus || existingUser.accountStatus || 'ACTIVE',
      });
    }

    let repManagerName: string | null = existingEmployee.reportingManagerName || null;
    if (reportingManagerId !== undefined) {
      if (reportingManagerId) {
        const mgr = await employeesRepository.getById(String(reportingManagerId));
        repManagerName = mgr ? mgr.fullName : null;
      } else {
        repManagerName = null;
      }
    }

    // Prepare updated employee payload
    const updatedEmployeeData: Employee = {
      ...existingEmployee,
      employeeId: newEmpId,
      fullName: cleanFullName,
      email: cleanEmail || existingEmployee.email || '',
      username: cleanUsername || existingEmployee.username || '',
      mobile: mobile !== undefined ? String(mobile).trim() : existingEmployee.mobile,
      department: department !== undefined ? String(department).trim() : existingEmployee.department,
      designation: designation !== undefined ? String(designation).trim() : existingEmployee.designation,
      assignedSiteIds: Array.isArray(assignedSiteIds) ? assignedSiteIds : existingEmployee.assignedSiteIds || [],
      assignedLocationIds: Array.isArray(assignedLocationIds) ? assignedLocationIds : existingEmployee.assignedLocationIds,
      assignedProjectSite: assignedProjectSite !== undefined ? String(assignedProjectSite).trim() : existingEmployee.assignedProjectSite,
      accountStatus: accountStatus && ['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(accountStatus) ? accountStatus : existingEmployee.accountStatus || 'ACTIVE',
      joiningDate: joiningDate || existingEmployee.joiningDate || new Date().toISOString().split('T')[0],
      dateOfBirth: dateOfBirth !== undefined ? (dateOfBirth ? String(dateOfBirth).trim() : undefined) : existingEmployee.dateOfBirth,
      reportingManagerId: reportingManagerId !== undefined ? (reportingManagerId ? String(reportingManagerId).trim().toUpperCase() : null) : existingEmployee.reportingManagerId,
      reportingManagerName: repManagerName,
      salaryStructure: salaryStructure !== undefined ? salaryStructure : existingEmployee.salaryStructure,
      updatedAt: new Date().toISOString(),
    };

    if (newEmpId !== cleanId) {
      // Save new document and delete old document to maintain clean ID primary key
      await employeesRepository.create(updatedEmployeeData);
      await employeesRepository.delete(cleanId);
    } else {
      await employeesRepository.update(cleanId, updatedEmployeeData);
    }

    // Write comprehensive immutable audit log
    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'EMPLOYEE_UPDATED',
      targetId: newEmpId,
      details: {
        previousEmployeeId: cleanId,
        newEmployeeId: newEmpId,
        updatedFields: {
          fullName: cleanFullName,
          email: cleanEmail,
          username: cleanUsername,
          mobile: updatedEmployeeData.mobile,
          department: updatedEmployeeData.department,
          designation: updatedEmployeeData.designation,
          assignedSiteIds: updatedEmployeeData.assignedSiteIds,
          assignedLocationIds: updatedEmployeeData.assignedLocationIds,
          accountStatus: updatedEmployeeData.accountStatus,
        },
      },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Employee profile for ${cleanFullName} (${newEmpId}) updated successfully.`,
      employee: updatedEmployeeData,
    });
  } catch (err: any) {
    console.error('Error updating employee:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to update employee record.' });
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

// GET /api/v1/admin/employees/:id/device-history - Visibility into device binding & unbind history
adminRouter.get('/employees/:id/device-history', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const cleanId = id.toUpperCase().trim();

  try {
    const employee = await employeesRepository.getById(cleanId);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'EMPLOYEE_NOT_FOUND' });
    }

    const activeDev = await devicesRepository.getActiveByEmployeeId(cleanId);
    const allDevs = await devicesRepository.getByEmployeeId(cleanId);
    const auditLogs = await auditRepository.getByTargetId(cleanId);

    // Filter relevant device-related audit events
    const deviceAudits = auditLogs.filter(
      (a) => a.action === 'DEVICE_UNBOUND' || a.action === 'DEVICE_RESET' || a.action === 'DEVICE_BOUND' || a.action === 'DEVICE_MISMATCH'
    );

    const historyItems = [
      ...allDevs.map((d) => ({
        id: d.id,
        action: (d.status === 'REVOKED' ? 'UNBOUND' : 'BOUND') as 'BOUND' | 'UNBOUND' | 'RESET',
        timestamp: d.registeredAt || d.createdAt || new Date().toISOString(),
        actorName: d.revokedByAdminId ? 'Administrator' : 'System / Employee',
        actorRole: d.revokedByAdminId ? 'admin' : 'employee',
        deviceModel: d.userAgent ? d.userAgent.split(' ')[0] : 'Web Device',
        userAgent: d.userAgent,
        ipAddress: d.ipAddress,
        reason: d.revocationReason || undefined,
      })),
      ...deviceAudits.map((a) => ({
        id: a.id,
        action: (a.action === 'DEVICE_RESET' || a.action === 'DEVICE_UNBOUND' ? 'UNBOUND' : 'BOUND') as 'BOUND' | 'UNBOUND' | 'RESET',
        timestamp: a.timestamp,
        actorName: a.actorName || 'Administrator',
        actorRole: a.actorRole || 'admin',
        deviceModel: 'Hardware Binding',
        userAgent: a.details?.userAgent || 'Standard Client',
        ipAddress: a.ipAddress,
        reason: a.details?.reason || (a.action === 'DEVICE_RESET' ? 'Reset by Administrator' : undefined),
      })),
    ];

    // Deduplicate and sort descending
    historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const unbindCount = historyItems.filter((h) => h.action === 'UNBOUND' || h.action === 'RESET').length;

    return res.json({
      success: true,
      employeeId: cleanId,
      employeeName: employee.fullName,
      currentStatus: employee.boundHardwareSignature || activeDev ? 'BOUND' : 'UNBOUND',
      unbindCount,
      activeDevice: activeDev || null,
      history: historyItems,
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

// Leaves Review & Ledger
adminRouter.get('/leaves', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await leavesRepository.getAll();
    return res.json({ success: true, leaves: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.get('/leaves/balances', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employees = await employeesRepository.getAll();
    const balances = await Promise.all(
      employees.map(async (emp) => {
        return await leaveLedgerRepository.getBalance(emp.employeeId, emp.fullName, emp.department);
      })
    );
    return res.json({ success: true, balances });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.patch('/leaves/:id/review', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, reviewComment } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'INVALID_STATUS', message: 'Status must be APPROVED or REJECTED.' });
  }

  try {
    const leave = await leavesRepository.getById(id);
    if (!leave) return res.status(404).json({ success: false, error: 'LEAVE_NOT_FOUND', message: 'Leave request not found.' });

    let paidDays = 0;
    let unpaidDays = 0;

    if (status === 'APPROVED') {
      // 1. Calculate eligible leave days (total days minus any official company holidays in range)
      // Note: Sunday is treated as a normal working day per organizational policy.
      const holidaysInRange = await holidaysRepository.getHolidaysInRange(leave.startDate, leave.endDate);
      const holidayDates = new Set(holidaysInRange.map((h) => h.date));

      // Count all active calendar days in range that are not holidays
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const dayList: string[] = [];
      const curr = new Date(start);

      while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        dayList.push(dStr);
        curr.setDate(curr.getDate() + 1);
      }

      const eligibleDays = dayList.filter((d) => !holidayDates.has(d)).length;

      // 2. Transactionally apply deduction from leave balance
      const deduction = await leaveLedgerRepository.applyLeaveDeduction(
        leave.employeeId,
        eligibleDays,
        id,
        reviewComment || `Approved Leave Request (${leave.startDate} to ${leave.endDate})`
      );

      paidDays = deduction.paidDays;
      unpaidDays = deduction.unpaidDays;

      // 3. Retrospective Attendance adjustments:
      // Update any existing attendance record on those dates or insert a clean LEAVE marker
      for (const dStr of dayList) {
        if (holidayDates.has(dStr)) continue; // Skip company holidays

        const existingRecords = await attendanceRepository.getByEmployeeAndDate(leave.employeeId, dStr);
        if (existingRecords.length > 0) {
          for (const rec of existingRecords) {
            const recId = rec.recordId || rec.id;
            if (recId) {
              await attendanceRepository.update(recId, {
                attendanceStatus: 'LEAVE',
                sessionStatus: 'CLOSED',
                isCorrected: true,
                adminCorrectionReason: `Approved Leave (${leave.leaveType}) - ${id}`,
                adminCorrectionBy: req.user!.fullName,
                adminCorrectionAt: new Date().toISOString(),
              });
            }
          }
        } else {
          // Create placeholder LEAVE record so muster register reflects leave
          const newRecordId = `att_leave_${leave.employeeId}_${dStr}`;
          await attendanceRepository.create({
            recordId: newRecordId,
            id: newRecordId,
            employeeId: leave.employeeId,
            employeeNameSnapshot: leave.employeeName || leave.employeeId,
            department: leave.department || 'Operations',
            siteId: 'SITE_LEAVE',
            siteNameSnapshot: 'Authorized Leave',
            locationId: 'LOC_LEAVE',
            locationNameSnapshot: 'Authorized Leave',
            shiftType: 'DAY',
            attendanceDate: dStr,
            businessDate: dStr,
            signInTime: null,
            signOutTime: null,
            signOutReason: null,
            workingMinutes: 0,
            attendanceState: 'NOT_SIGNED_IN',
            sessionStatus: 'CLOSED',
            attendanceStatus: 'LEAVE',
            isLate: false,
            isExtraShift: false,
            extraShiftType: null,
            isCorrected: true,
            activeCorrectionId: null,
            adminCorrectionReason: `Approved Leave (${leave.leaveType}) - ${id}`,
            adminCorrectionBy: req.user!.fullName,
            adminCorrectionAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    const updates = {
      status,
      paidDays,
      unpaidDays,
      reviewComment: reviewComment || null,
      reviewedByAdminId: req.user!.employeeId,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await leavesRepository.update(id, updates);

    // 4. Send persistent notification to employee
    const notifTitle = status === 'APPROVED' ? 'Leave Request Approved' : 'Leave Request Rejected';
    const notifMsg =
      status === 'APPROVED'
        ? `Your leave request for ${leave.startDate} to ${leave.endDate} has been APPROVED (${paidDays} Paid, ${unpaidDays} Unpaid). ${reviewComment ? `Note: ${reviewComment}` : ''}`
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
      details: {
        employeeId: leave.employeeId,
        status,
        paidDays,
        unpaidDays,
        comment: reviewComment,
      },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, leave: { ...leave, ...updates } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Regularization Requests Admin Management
adminRouter.get('/regularize', async (req: AuthenticatedRequest, res: Response) => {
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
    if (!regReq) {
      return res.status(404).json({ success: false, error: 'REQUEST_NOT_FOUND', message: 'Regularization request not found.' });
    }

    if (status === 'APPROVED') {
      // Find or create attendance record for that date
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
            workingMinutes: 540, // standard full day
            adminCorrectionReason: `Regularization Approved: ${regReq.reason}`,
            adminCorrectionBy: req.user!.fullName,
            adminCorrectionAt: new Date().toISOString(),
          });
        }
      } else {
        // Create approved attendance record
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
          signOutReason: 'NORMAL_END',
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
        ? `Your attendance regularization for ${regReq.attendanceDate} (${regReq.shiftType} Shift) has been APPROVED and marked as Present (Full Day).`
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
      details: {
        employeeId: regReq.employeeId,
        date: regReq.attendanceDate,
        status,
        comment: reviewComment,
      },
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

// Bulk Access Management (Centralized assignment of Projects, Sites & Geofences)
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
      details: {
        targetType,
        targetId: cleanTargetId,
        action,
        count: modifiedCount,
        employeeIds,
      },
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

// Holidays Management CRUD
adminRouter.get('/holidays', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const holidays = await holidaysRepository.getAll();
    return res.json({ success: true, holidays });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/holidays', async (req: AuthenticatedRequest, res: Response) => {
  const { name, date, isMandatory, description } = req.body;

  if (!name || !date) {
    return res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'Holiday name and date (YYYY-MM-DD) are required.' });
  }

  const cleanDate = String(date).trim();
  const year = parseInt(cleanDate.split('-')[0], 10) || new Date().getFullYear();
  const id = `hol_${cleanDate}_${Math.random().toString(36).substring(2, 6)}`;

  const holidayDoc: Holiday = {
    id,
    name: String(name).trim(),
    date: cleanDate,
    isMandatory: isMandatory !== false,
    description: description ? String(description).trim() : '',
    year,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const created = await holidaysRepository.create(holidayDoc);
    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'HOLIDAY_CREATED',
      targetId: id,
      details: { name, date: cleanDate, year },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: 'Holiday added successfully.', holiday: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.put('/holidays/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, date, isMandatory, description, isActive } = req.body;

  try {
    const existing = await holidaysRepository.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'HOLIDAY_NOT_FOUND', message: 'Holiday not found.' });
    }

    const updates: Partial<Holiday> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (date !== undefined) {
      updates.date = String(date).trim();
      updates.year = parseInt(updates.date.split('-')[0], 10);
    }
    if (isMandatory !== undefined) updates.isMandatory = !!isMandatory;
    if (description !== undefined) updates.description = String(description).trim();
    if (isActive !== undefined) updates.isActive = !!isActive;

    await holidaysRepository.update(id, updates);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'HOLIDAY_UPDATED',
      targetId: id,
      details: updates,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: 'Holiday updated successfully.', holiday: { ...existing, ...updates } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.delete('/holidays/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await holidaysRepository.delete(id);
    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'HOLIDAY_DELETED',
      targetId: id,
      details: { holidayId: id },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: 'Holiday deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Geofence Location safely with employee reference cleanup
adminRouter.delete('/locations/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const loc = await locationsRepository.getById(id);
    if (!loc) return res.status(404).json({ success: false, error: 'LOCATION_NOT_FOUND' });

    await locationsRepository.update(id, { isActive: false });

    // Clean up stale location reference from employees
    const allEmployees = await employeesRepository.getAll();
    let cleanedEmpsCount = 0;
    for (const emp of allEmployees) {
      if (emp.assignedLocationIds && emp.assignedLocationIds.includes(id)) {
        const newLocIds = emp.assignedLocationIds.filter((locId) => locId !== id);
        await employeesRepository.update(emp.employeeId, {
          assignedLocationIds: newLocIds,
        });
        cleanedEmpsCount++;
      }
    }

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'LOCATION_DEACTIVATED',
      targetId: id,
      details: { locationName: loc.locationName, cleanedEmpsCount },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: `Location "${loc.locationName}" has been deactivated and removed from ${cleanedEmpsCount} employee profiles.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// PAYROLL ENGINE API ROUTES (ADMIN ONLY)
// ==========================================

// GET /api/v1/admin/payroll - List all payroll runs
adminRouter.get('/payroll', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const runs = await payrollRepository.getAllRuns();
    return res.json({ success: true, runs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/payroll/generate - Generate draft payroll for a target month
adminRouter.post('/payroll/generate', async (req: AuthenticatedRequest, res: Response) => {
  const { month } = req.body;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_MONTH',
      message: 'A valid month in YYYY-MM format is required.',
    });
  }

  try {
    // Check if payroll run already exists for this month
    const existingRun = await payrollRepository.getRunByMonth(month);
    if (existingRun && existingRun.status === 'PUBLISHED') {
      return res.status(400).json({
        success: false,
        error: 'PAYROLL_ALREADY_PUBLISHED',
        message: `Payroll for ${month} has already been published to employees. It cannot be regenerated.`,
      });
    }

    const allEmployees = await employeesRepository.getAll();
    const activeEmployees = allEmployees.filter((e) => e.accountStatus !== 'SUSPENDED');

    if (activeEmployees.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'NO_EMPLOYEES',
        message: 'No active employees found to generate payroll.',
      });
    }

    const allRecords = await attendanceRepository.queryRecords({});
    const allLeaves = await leavesRepository.getAll();
    const allHolidays = await holidaysRepository.getAll();
    const masterReg = await masterRegisterRepository.getByMonth(month);

    const runId = existingRun ? existingRun.id : `run_${month}_${Date.now()}`;
    const items: PayrollItem[] = [];

    for (const emp of activeEmployees) {
      let item: PayrollItem;
      const regEntry = masterReg?.entries.find((e) => e.employeeId === emp.employeeId);

      if (regEntry) {
        item = payrollService.calculateItemFromMasterRegister({
          employee: emp,
          entry: regEntry,
          payrollRunId: runId,
        });
      } else {
        item = payrollService.calculateItem({
          employee: emp,
          month,
          payrollRunId: runId,
          records: allRecords,
          leaves: allLeaves,
          holidays: allHolidays,
        });
      }
      items.push(item);
    }

    const totalGrossAmount = items.reduce((sum, it) => sum + it.totalGrossEarned, 0);
    const totalDeductionsAmount = items.reduce((sum, it) => sum + it.totalDeductions, 0);
    const totalNetAmount = items.reduce((sum, it) => sum + it.netSalary, 0);

    const nowIso = new Date().toISOString();
    const run: PayrollRun = {
      id: runId,
      month,
      status: 'DRAFT',
      totalEmployees: items.length,
      totalGrossAmount,
      totalDeductionsAmount,
      totalNetAmount,
      generatedByAdminId: req.user!.employeeId,
      generatedByAdminName: req.user!.fullName,
      finalizedAt: null,
      publishedAt: null,
      createdAt: existingRun ? existingRun.createdAt : nowIso,
      updatedAt: nowIso,
    };

    const savedRun = await payrollRepository.saveRun(run, items);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'PAYROLL_GENERATED',
      targetId: runId,
      details: {
        month,
        totalEmployees: items.length,
        totalNetAmount,
      },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Payroll draft generated for ${month} across ${items.length} employees.`,
      run: savedRun,
    });
  } catch (err: any) {
    console.error('Failed to generate payroll:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/admin/payroll/:id - Get specific payroll run with items
adminRouter.get('/payroll/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const run = await payrollRepository.getRunById(id);
    if (!run) return res.status(404).json({ success: false, error: 'PAYROLL_RUN_NOT_FOUND' });
    return res.json({ success: true, run });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/admin/payroll/:id/items/:itemId - Update adjustments on an individual employee payroll item
adminRouter.put('/payroll/:id/items/:itemId', async (req: AuthenticatedRequest, res: Response) => {
  const { id, itemId } = req.params;
  const {
    incentivesBonus,
    extraNightBonus,
    otherAllowances,
    otherDeductions,
    tdsDeduction,
    remarks,
    paymentStatus,
    paidOn,
  } = req.body;

  try {
    const run = await payrollRepository.getRunById(id);
    if (!run) return res.status(404).json({ success: false, error: 'PAYROLL_RUN_NOT_FOUND' });
    if (run.status === 'PUBLISHED') {
      return res.status(400).json({ success: false, error: 'PAYROLL_LOCKED', message: 'Cannot edit items on a published payroll run.' });
    }

    const currentItem = (run.items || []).find((it) => it.id === itemId);
    if (!currentItem) return res.status(404).json({ success: false, error: 'ITEM_NOT_FOUND' });

    const newIncentives = typeof incentivesBonus === 'number' ? incentivesBonus : currentItem.incentivesBonus;
    const newExtraNight = typeof extraNightBonus === 'number' ? extraNightBonus : currentItem.extraNightBonus;
    const newOtherAllowances = typeof otherAllowances === 'number' ? otherAllowances : currentItem.earnedOtherAllowances;
    const newOtherDeductions = typeof otherDeductions === 'number' ? otherDeductions : currentItem.otherDeductions;
    const newTds = typeof tdsDeduction === 'number' ? tdsDeduction : currentItem.tdsDeduction;

    const totalGrossEarned =
      currentItem.earnedBasic +
      currentItem.earnedHra +
      currentItem.earnedConveyance +
      currentItem.earnedMedical +
      currentItem.earnedSpecialAllowance +
      newOtherAllowances +
      newExtraNight +
      newIncentives;

    const totalDeductions = currentItem.pfDeduction + currentItem.ptDeduction + newTds + newOtherDeductions;
    const netSalary = Math.max(0, totalGrossEarned - totalDeductions);
    const netSalaryInWords = convertNumberToIndianWords(netSalary);

    const updates: Partial<PayrollItem> = {
      incentivesBonus: newIncentives,
      extraNightBonus: newExtraNight,
      earnedOtherAllowances: newOtherAllowances,
      otherDeductions: newOtherDeductions,
      tdsDeduction: newTds,
      totalGrossEarned,
      totalDeductions,
      netSalary,
      netSalaryInWords,
      remarks: remarks !== undefined ? remarks : currentItem.remarks,
      paymentStatus: paymentStatus || currentItem.paymentStatus,
      paidOn: paidOn !== undefined ? paidOn : currentItem.paidOn,
    };

    const updatedItem = await payrollRepository.updateItem(id, itemId, updates);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'PAYROLL_ITEM_UPDATED',
      targetId: itemId,
      details: { runId: id, employeeId: currentItem.employeeId, netSalary },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, item: updatedItem });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/payroll/:id/finalize - Finalize payroll run
adminRouter.post('/payroll/:id/finalize', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const run = await payrollRepository.getRunById(id);
    if (!run) return res.status(404).json({ success: false, error: 'PAYROLL_RUN_NOT_FOUND' });

    const nowIso = new Date().toISOString();
    await payrollRepository.updateRun(id, {
      status: 'FINALIZED',
      finalizedAt: nowIso,
      finalizedBy: req.user!.fullName,
    });

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'PAYROLL_FINALIZED',
      targetId: id,
      details: { month: run.month, totalNetAmount: run.totalNetAmount },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: `Payroll for ${run.month} has been finalized.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/payroll/:id/publish - Publish salary slips to employees
adminRouter.post('/payroll/:id/publish', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const run = await payrollRepository.getRunById(id);
    if (!run) return res.status(404).json({ success: false, error: 'PAYROLL_RUN_NOT_FOUND' });

    const nowIso = new Date().toISOString();
    await payrollRepository.updateRun(id, {
      status: 'PUBLISHED',
      publishedAt: nowIso,
      publishedBy: req.user!.fullName,
    });

    // Send notification to all employees in this run
    if (run.items) {
      for (const item of run.items) {
        await notificationsRepository.create({
          id: `NOTIF_PAY_${item.id}_${Date.now()}`,
          employeeId: item.employeeId,
          type: 'ANNOUNCEMENT',
          title: `Salary Slip Published - ${run.month}`,
          message: `Your salary slip for ${run.month} (Net: ₹${item.netSalary.toLocaleString('en-IN')}) is now available in your profile.`,
          date: nowIso.split('T')[0],
          read: false,
          actionType: 'OPEN_DRAWER',
          createdAt: nowIso,
        });
      }
    }

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'PAYROLL_PUBLISHED',
      targetId: id,
      details: { month: run.month, totalEmployees: run.totalEmployees, totalNetAmount: run.totalNetAmount },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Salary slips for ${run.month} published successfully to ${run.totalEmployees} employees.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/admin/payroll/:id - Discard draft payroll run
adminRouter.delete('/payroll/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const run = await payrollRepository.getRunById(id);
    if (!run) return res.status(404).json({ success: false, error: 'PAYROLL_RUN_NOT_FOUND' });
    if (run.status === 'PUBLISHED') {
      return res.status(400).json({ success: false, error: 'CANNOT_DELETE_PUBLISHED', message: 'Published payroll runs cannot be deleted.' });
    }

    await payrollRepository.deleteRun(id);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'PAYROLL_DRAFT_DELETED',
      targetId: id,
      details: { month: run.month },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({ success: true, message: `Payroll draft for ${run.month} deleted.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/admin/payroll/slips/:itemId - Get salary slip data
adminRouter.get('/payroll/slips/:itemId', async (req: AuthenticatedRequest, res: Response) => {
  const { itemId } = req.params;
  try {
    const slip = await payrollRepository.getSlipById(itemId);
    if (!slip) return res.status(404).json({ success: false, error: 'SLIP_NOT_FOUND' });
    return res.json({ success: true, slip });
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

// ==========================================================
// MASTER REGISTER & ATTENDANCE FINALIZATION API (ADMIN ONLY)
// ==========================================================

// GET /api/v1/admin/master-register - Get Master Register summary and entries with optional site/dept filter
adminRouter.get('/master-register', async (req: AuthenticatedRequest, res: Response) => {
  const { month, siteId, department } = req.query;
  const targetMonth = month ? String(month) : shiftService.getISTDateParts().yearMonth;

  try {
    let summary = await masterRegisterRepository.getByMonth(targetMonth);

    // If summary doesn't exist yet, automatically calculate draft register
    if (!summary) {
      const allEmployees = await employeesRepository.getAll();
      const activeEmployees = allEmployees.filter((e) => e.accountStatus !== 'SUSPENDED');
      const allSites = await sitesRepository.getAll();
      const allRecords = await attendanceRepository.queryRecords({});
      const allLeaves = await leavesRepository.getAll();
      const allHolidays = await holidaysRepository.getAll();

      const entries: MasterRegisterEntry[] = [];

      for (const emp of activeEmployees) {
        const site = allSites.find((s) => emp.assignedSiteIds?.includes(s.siteId));
        const entry = payrollService.calculateMasterRegisterEntry({
          employee: emp,
          month: targetMonth,
          records: allRecords,
          leaves: allLeaves,
          holidays: allHolidays,
          siteName: site?.siteName || emp.assignedProjectSite,
        });
        entries.push(entry);
      }

      const totalPayableDays = entries.reduce((sum, e) => sum + e.totalPayableDays, 0);
      const nowIso = new Date().toISOString();

      const newSummary: MasterRegisterSummary = {
        month: targetMonth,
        status: 'DRAFT',
        totalEmployees: entries.length,
        finalizedCount: 0,
        totalPayableDays,
        submittedAt: null,
        submittedBy: null,
        finalizedAt: null,
        finalizedBy: null,
        reopenedAt: null,
        reopenedBy: null,
        entries,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      summary = await masterRegisterRepository.saveSummary(newSummary);
    }

    // Apply filtering if provided
    let filteredEntries = summary.entries || [];
    if (department && department !== 'ALL') {
      filteredEntries = filteredEntries.filter((e) => e.department === String(department));
    }
    if (siteId && siteId !== 'ALL') {
      filteredEntries = filteredEntries.filter((e) => e.siteId === String(siteId));
    }

    return res.json({
      success: true,
      summary: {
        ...summary,
        entries: filteredEntries,
      },
    });
  } catch (err: any) {
    console.error('[Master Register Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/master-register/generate - Re-sync / generate fresh Master Register calculations
adminRouter.post('/master-register/generate', async (req: AuthenticatedRequest, res: Response) => {
  const { month } = req.body;
  const targetMonth = month ? String(month) : shiftService.getISTDateParts().yearMonth;

  try {
    const existing = await masterRegisterRepository.getByMonth(targetMonth);
    if (existing && existing.status === 'FINALIZED') {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_FINALIZED',
        message: `Master Register for ${targetMonth} is FINALIZED and locked. Reopen it to recalculate.`,
      });
    }

    const allEmployees = await employeesRepository.getAll();
    const activeEmployees = allEmployees.filter((e) => e.accountStatus !== 'SUSPENDED');
    const allSites = await sitesRepository.getAll();
    const allRecords = await attendanceRepository.queryRecords({});
    const allLeaves = await leavesRepository.getAll();
    const allHolidays = await holidaysRepository.getAll();

    const entries: MasterRegisterEntry[] = [];

    for (const emp of activeEmployees) {
      const site = allSites.find((s) => emp.assignedSiteIds?.includes(s.siteId));
      const entry = payrollService.calculateMasterRegisterEntry({
        employee: emp,
        month: targetMonth,
        records: allRecords,
        leaves: allLeaves,
        holidays: allHolidays,
        siteName: site?.siteName || emp.assignedProjectSite,
      });

      // Preserve previous admin adjustments if re-generating draft
      if (existing) {
        const prevEntry = existing.entries.find((pe) => pe.employeeId === emp.employeeId);
        if (prevEntry && prevEntry.adminNotes) {
          entry.adminNotes = prevEntry.adminNotes;
        }
      }

      entries.push(entry);
    }

    const totalPayableDays = entries.reduce((sum, e) => sum + e.totalPayableDays, 0);
    const nowIso = new Date().toISOString();

    const summaryData: MasterRegisterSummary = {
      month: targetMonth,
      status: existing ? existing.status : 'DRAFT',
      totalEmployees: entries.length,
      finalizedCount: 0,
      totalPayableDays,
      submittedAt: existing?.submittedAt || null,
      submittedBy: existing?.submittedBy || null,
      finalizedAt: null,
      finalizedBy: null,
      reopenedAt: existing?.reopenedAt || null,
      reopenedBy: existing?.reopenedBy || null,
      entries,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const saved = await masterRegisterRepository.saveSummary(summaryData);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'MASTER_REGISTER_SYNCED',
      targetId: targetMonth,
      details: { month: targetMonth, totalEmployees: entries.length, totalPayableDays },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Master Register recalculated successfully for ${targetMonth} across ${entries.length} employees.`,
      summary: saved,
    });
  } catch (err: any) {
    console.error('Error generating master register:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/admin/master-register/:month/entries/:entryId - Admin attendance modification on Master Register
adminRouter.put('/master-register/:month/entries/:entryId', async (req: AuthenticatedRequest, res: Response) => {
  const { month, entryId } = req.params;
  const {
    adminFinalPresentDays,
    adminFinalAbsentDays,
    totalPayableDays,
    adminNotes,
  } = req.body;

  try {
    const summary = await masterRegisterRepository.getByMonth(month);
    if (!summary) {
      return res.status(404).json({ success: false, error: 'REGISTER_NOT_FOUND', message: 'Master Register not found.' });
    }

    if (summary.status === 'FINALIZED') {
      return res.status(400).json({
        success: false,
        error: 'LOCKED',
        message: 'Master Register is finalized. Reopen it before making modifications.',
      });
    }

    const currentEntry = summary.entries.find((e) => e.id === entryId);
    if (!currentEntry) {
      return res.status(404).json({ success: false, error: 'ENTRY_NOT_FOUND', message: 'Employee register entry not found.' });
    }

    const updates: Partial<MasterRegisterEntry> = {
      adminFinalPresentDays: typeof adminFinalPresentDays === 'number' ? adminFinalPresentDays : currentEntry.adminFinalPresentDays,
      adminFinalAbsentDays: typeof adminFinalAbsentDays === 'number' ? adminFinalAbsentDays : currentEntry.adminFinalAbsentDays,
      totalPayableDays: typeof totalPayableDays === 'number' ? totalPayableDays : currentEntry.totalPayableDays,
      adminNotes: adminNotes !== undefined ? String(adminNotes).trim() : currentEntry.adminNotes,
      lastModifiedByAdminId: req.user!.employeeId,
      lastModifiedByAdminName: req.user!.fullName,
      lastModifiedAt: new Date().toISOString(),
    };

    const updatedEntry = await masterRegisterRepository.updateEntry(month, entryId, updates);

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: 'MASTER_REGISTER_ENTRY_OVERRIDE',
      targetId: entryId,
      details: {
        month,
        employeeId: currentEntry.employeeId,
        previousPayableDays: currentEntry.totalPayableDays,
        newPayableDays: updates.totalPayableDays,
        adminNotes: updates.adminNotes,
      },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Attendance adjustments saved for ${currentEntry.employeeName}.`,
      entry: updatedEntry,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/master-register/:month/status - Status transition (SUBMITTED / FINALIZED / REOPENED)
adminRouter.post('/master-register/:month/status', async (req: AuthenticatedRequest, res: Response) => {
  const { month } = req.params;
  const { status } = req.body;

  if (!status || !['DRAFT', 'SUBMITTED', 'FINALIZED', 'REOPENED'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_STATUS',
      message: 'Status must be one of: DRAFT, SUBMITTED, FINALIZED, REOPENED',
    });
  }

  try {
    const updatedSummary = await masterRegisterRepository.updateStatus(
      month,
      status as MasterRegisterStatus,
      req.user!.employeeId,
      req.user!.fullName
    );

    await auditRepository.log({
      actorId: req.user!.employeeId,
      actorName: req.user!.fullName,
      actorRole: 'admin',
      action: `MASTER_REGISTER_${status}`,
      targetId: month,
      details: { month, status, adminName: req.user!.fullName },
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: `Master Register status for ${month} changed to ${status}.`,
      summary: updatedSummary,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/admin/attendance/day-wise - Day-wise attendance breakdown for employee(s) and month
adminRouter.get('/attendance/day-wise', async (req: AuthenticatedRequest, res: Response) => {
  const { month, employeeIds } = req.query;
  const targetMonth = month ? String(month) : shiftService.getISTDateParts().yearMonth;

  try {
    const allEmployees = await employeesRepository.getAll();
    const allRecords = await attendanceRepository.queryRecords({});
    const allLeaves = await leavesRepository.getAll();
    const allHolidays = await holidaysRepository.getAll();

    let targetEmployees = allEmployees;
    if (employeeIds && typeof employeeIds === 'string' && employeeIds !== 'ALL') {
      const idList = employeeIds.split(',').map((s) => s.trim().toUpperCase());
      targetEmployees = targetEmployees.filter((e) => idList.includes(e.employeeId));
    }

    const breakdowns = targetEmployees.map((emp) => {
      const entry = payrollService.calculateMasterRegisterEntry({
        employee: emp,
        month: targetMonth,
        records: allRecords,
        leaves: allLeaves,
        holidays: allHolidays,
      });

      return {
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        month: targetMonth,
        dayWiseBreakdown: entry.dayWiseBreakdown || [],
        totals: {
          presentDays: entry.actualPresentDays,
          absentDays: entry.actualAbsentDays,
          paidLeaves: entry.paidLeaves,
          unpaidLeaves: entry.unpaidLeaves,
          holidays: entry.holidays,
          holidaysWorked: entry.holidaysWorked,
          lateMarks: entry.lateMarksCount,
          halfDays: entry.halfDaysCount,
          extraNights: entry.extraNightsCount,
          totalPayableDays: entry.totalPayableDays,
        },
      };
    });

    return res.json({
      success: true,
      month: targetMonth,
      breakdowns,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

