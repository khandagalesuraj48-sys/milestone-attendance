import { adminDb } from '../firebaseAdmin';
import { attendanceRepository } from '../repositories/attendanceRepository';
import { employeesRepository } from '../repositories/employeesRepository';
import { sitesRepository } from '../repositories/sitesRepository';
import { locationsRepository } from '../repositories/locationsRepository';
import { policyRepository } from '../repositories/policyRepository';
import { auditRepository } from '../repositories/auditRepository';
import { geoService } from './geoService';
import { shiftService } from './shiftService';
import { deviceService } from './deviceService';
import { AttendanceRecord, ShiftType, User } from '../../src/types';

export interface PunchInParams {
  user: User;
  shiftType: ShiftType;
  siteId: string;
  locationId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  installationKey?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PunchOutParams {
  user: User;
  latitude: number;
  longitude: number;
  accuracy?: number;
  ipAddress?: string;
  userAgent?: string;
}

export const attendanceService = {
  /**
   * Complete 14-step validated server-authoritative Punch In
   */
  async punchIn(params: PunchInParams): Promise<{ record: AttendanceRecord; message: string }> {
    const { user, shiftType, siteId, locationId, latitude, longitude, accuracy, installationKey, ipAddress, userAgent } = params;

    // STEP 1: Verify Employee Account Status
    const employee = await employeesRepository.getById(user.employeeId);
    if (!employee || employee.accountStatus !== 'ACTIVE') {
      throw new Error(`Employee account (${user.employeeId}) is inactive, suspended, or not found. Attendance is locked.`);
    }

    // STEP 2: Verify Hardware Device Binding
    if (installationKey) {
      const devCheck = await deviceService.validateOrBindDevice(
        employee.employeeId,
        employee.fullName,
        installationKey,
        ipAddress,
        userAgent
      );
      if (!devCheck.isValid) {
        throw new Error(devCheck.error || 'Device verification failed.');
      }
    }

    // STEP 3: Validate Authorized Project Site
    const assignedSites = employee.assignedSiteIds || [];
    if (!assignedSites.includes(siteId)) {
      throw new Error(`Unauthorized site assignment. You are not assigned to project site ${siteId}.`);
    }

    const site = await sitesRepository.getById(siteId);
    if (!site || !site.isActive) {
      throw new Error(`Project site ${siteId} is currently inactive or not found.`);
    }

    // STEP 4: Validate Approved Location under the Site
    const location = await locationsRepository.getById(locationId);
    if (!location || !location.isActive) {
      throw new Error(`Location ${locationId} is inactive or not found.`);
    }
    if (location.siteId && location.siteId !== siteId) {
      throw new Error(`Location ${location.locationName} belongs to site ${location.siteId}, not ${siteId}.`);
    }

    // STEP 5 & 6: Validate GPS Accuracy and Haversine Geofence
    const geoCheck = geoService.validateLocationGeofence(
      latitude,
      longitude,
      accuracy,
      location.latitude,
      location.longitude,
      location.radiusMeters,
      location.accuracyThresholdMeters || 100
    );
    if (!geoCheck.accuracyPassed || !geoCheck.isWithinGeofence) {
      throw new Error(geoCheck.errorMessage || 'Geofence validation failed.');
    }

    // STEP 7: Validate Shift Type
    if (shiftType !== 'DAY' && shiftType !== 'NIGHT') {
      throw new Error(`Invalid shift type: ${shiftType}. Must be DAY or NIGHT.`);
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const istParts = shiftService.getISTDateParts(now);
    const businessDate = shiftService.getBusinessDate(shiftType, now);
    const rules = await policyRepository.getRules();

    // STEP 8: Global Single Active Session Check (ONE EMPLOYEE = ONE ACTIVE SESSION)
    const activeSession = await attendanceRepository.getActiveSession(employee.employeeId);
    if (activeSession) {
      throw new Error(
        `Active session already in progress. You are already signed into the ${activeSession.shiftType} shift at ${activeSession.siteNameSnapshot}. You must sign out of your open session before starting a new shift.`
      );
    }

    // STEP 9 & 10: Single Session Per Shift & Double-Shift Rules
    const todayRecords = await attendanceRepository.getByEmployeeAndDate(employee.employeeId, businessDate);
    const existingSameShift = todayRecords.find((r) => r.shiftType === shiftType);

    if (existingSameShift) {
      throw new Error(
        `You have already recorded a ${shiftType} shift for business date ${businessDate}. Multi-site sign-ins within the same shift are prohibited.`
      );
    }

    // Check if this is an authorized Extra Night double-shift
    let isExtraShift = false;
    let extraShiftType: string | null = null;
    const existingDayShift = todayRecords.find((r) => r.shiftType === 'DAY');

    if (shiftType === 'NIGHT' && existingDayShift) {
      isExtraShift = true;
      extraShiftType = 'EXTRA_NIGHT';
    }

    // STEP 11: Late Mark Evaluation & Monthly Index
    const lateEval = shiftService.evaluateLateStatus(shiftType, nowIso, rules);
    const monthlyRecords = await attendanceRepository.getMonthlyForEmployee(employee.employeeId, istParts.yearMonth);
    const priorLateCount = monthlyRecords.filter((r) => r.isLate).length;
    const lateMarkIndex = lateEval.isLate ? priorLateCount + 1 : 0;

    // STEP 12: Build & Persist Attendance Record
    const recordId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: AttendanceRecord = {
      id: recordId,
      recordId,
      employeeId: employee.employeeId,
      employeeName: employee.fullName,
      siteId: site.siteId,
      siteNameSnapshot: site.siteName,
      locationId: location.locationId || location.id,
      locationNameSnapshot: location.locationName || location.name,
      shiftType,
      businessDate,
      attendanceDate: businessDate,
      sessionStatus: 'OPEN',
      attendanceState: 'SIGNED_IN',
      attendanceStatus: 'ABSENT', // Calculated upon sign-out based on total duration
      signInTime: nowIso,
      signOutTime: null,
      workingMinutes: 0,
      isLate: lateEval.isLate,
      lateMinutes: lateEval.lateMinutes,
      lateMarkIndex,
      isExtraShift,
      extraShiftType,
      isCorrected: false,
      activeCorrectionId: null,
      signInCoordinates: { latitude, longitude, accuracy },
      signOutCoordinates: null,
      geofenceDistanceMeters: geoCheck.distanceMeters,
      locationAccuracyMeters: accuracy,
      signOutReason: null,
      autoSignedOutAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const savedRecord = await attendanceRepository.create(newRecord);

    // STEP 13 & 14: Log Audit Trail
    await auditRepository.log({
      actorId: user.employeeId,
      actorName: user.fullName,
      actorRole: user.role,
      action: isExtraShift ? 'EXTRA_NIGHT_SIGN_IN' : 'ATTENDANCE_SIGN_IN',
      targetId: savedRecord.recordId || recordId,
      details: {
        shiftType,
        siteId: site.siteId,
        siteName: site.siteName,
        locationName: location.locationName,
        distanceMeters: geoCheck.distanceMeters,
        isLate: lateEval.isLate,
        lateMinutes: lateEval.lateMinutes,
        isExtraShift,
      },
      ipAddress: ipAddress || '127.0.0.1',
    });

    const shiftDisplay = isExtraShift ? 'EXTRA NIGHT Shift' : `${shiftType} Shift`;
    return {
      record: savedRecord,
      message: `Successfully Signed In for ${shiftDisplay} at ${site.siteName} (${location.locationName}). Verified within ${geoCheck.distanceMeters}m geofence.`,
    };
  },

  /**
   * Complete verified server-authoritative Punch Out
   */
  async punchOut(params: PunchOutParams): Promise<{ record: AttendanceRecord; message: string }> {
    const { user, latitude, longitude, accuracy, ipAddress } = params;

    const activeSession = await attendanceRepository.getActiveSession(user.employeeId);
    if (!activeSession) {
      throw new Error('No active open session found to sign out from.');
    }

    // Geofence Validation on Sign Out
    if (activeSession.locationId) {
      const location = await locationsRepository.getById(activeSession.locationId);
      if (location && location.isActive) {
        const geoCheck = geoService.validateLocationGeofence(
          latitude,
          longitude,
          accuracy || 10,
          location.latitude,
          location.longitude,
          location.radiusMeters,
          location.accuracyThresholdMeters || 100
        );
        if (!geoCheck.accuracyPassed || !geoCheck.isWithinGeofence) {
          throw new Error(geoCheck.errorMessage || 'Outside Attendance Area. You must be within your assigned site to sign out.');
        }
      }
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const rules = await policyRepository.getRules();

    // Calculate Working Duration
    const startMs = new Date(activeSession.signInTime || nowIso).getTime();
    const endMs = now.getTime();
    const workingMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));

    // Evaluate Attendance Status
    const istParts = shiftService.getISTDateParts(now);
    const monthlyRecords = await attendanceRepository.getMonthlyForEmployee(user.employeeId, istParts.yearMonth);
    const monthlyLateCount = monthlyRecords.filter((r) => r.isLate).length;

    const status = shiftService.calculateAttendanceStatus(workingMinutes, rules, monthlyLateCount);

    const updates: Partial<AttendanceRecord> = {
      signOutTime: nowIso,
      sessionStatus: 'CLOSED',
      attendanceState: 'SIGNED_OUT',
      attendanceStatus: status,
      workingMinutes,
      signOutReason: 'NORMAL',
      signOutCoordinates: { latitude, longitude, accuracy: accuracy || 10 },
      updatedAt: nowIso,
    };

    const targetId = activeSession.recordId || activeSession.id || '';
    await attendanceRepository.update(targetId, updates);
    const updatedRecord = { ...activeSession, ...updates } as AttendanceRecord;

    await auditRepository.log({
      actorId: user.employeeId,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'ATTENDANCE_SIGN_OUT',
      targetId,
      details: {
        shiftType: activeSession.shiftType,
        workingMinutes,
        calculatedStatus: status,
        siteName: activeSession.siteNameSnapshot,
      },
      ipAddress: ipAddress || '127.0.0.1',
    });

    const hours = (workingMinutes / 60).toFixed(1);
    return {
      record: updatedRecord,
      message: `Signed Out successfully. Total duration: ${hours} hours (${workingMinutes} minutes). Attendance marked as ${status}.`,
    };
  },
};
