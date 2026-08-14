// Milestone Consultancy Employee Attendance & Workforce Management System
// Shared TypeScript Types & Interfaces — Final V1 Multi-Site Implementation Baseline

export type UserRole = 'admin' | 'employee';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type ShiftType = 'DAY' | 'NIGHT';
export type ExtraShiftType = 'NONE' | 'EXTRA_NIGHT' | string;

export type SessionStatus = 'OPEN' | 'CLOSED';
export type AttendanceState = 'NOT_SIGNED_IN' | 'SIGNED_IN' | 'SIGNED_OUT' | 'AUTO_SIGNED_OUT';

export type AttendanceStatus =
  | 'PRESENT_FULL_DAY'
  | 'PRESENT_HALF_DAY'
  | 'ABSENT'
  | 'LEAVE'
  | 'WEEKLY_OFF'
  | 'HOLIDAY';

export type SignOutType = 'MANUAL' | 'AUTO_SIGNED_OUT';
export type SignOutReason = 'NORMAL' | 'NORMAL_USER_PUNCH' | 'EMPLOYEE_FORGOT_SIGN_OUT' | 'ADMIN_OVERRIDE' | string;

export interface User {
  uid: string;
  id?: string;
  username: string;
  email?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  mustChangePassword: boolean;
  employeeId: string;
  fullName: string;
  department?: string;
  designation?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface Site {
  siteId: string;
  siteName: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Location {
  locationId: string;
  siteId: string;
  siteName?: string;
  locationName: string;
  address?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  accuracyThresholdMeters: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Backward compatibility alias for UI components
export type LocationSite = Location & {
  id?: string;
  name?: string;
};

export interface Employee {
  id?: string;
  uid?: string;
  employeeId: string;
  username: string;
  fullName: string;
  mobile: string;
  email: string;
  department: string;
  designation: string;
  joiningDate: string;
  dateOfBirth?: string;
  photoUrl?: string;
  assignedSiteIds: string[]; // 1..N authorized Sites
  assignedLocationIds?: string[];
  assignedProjectSite?: string;
  accountStatus: AccountStatus;
  boundHardwareSignature: string | null;
  activeDeviceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamAnnouncement {
  id: string;
  type: 'NEW_MEMBER' | 'ANNIVERSARY' | 'COMPANY';
  title: string;
  employeeName?: string;
  designation?: string;
  siteName?: string;
  photoUrl?: string;
  description?: string;
  date?: string;
  milestoneMonths?: number;
}

export interface UpcomingBirthday {
  employeeId: string;
  employeeName: string;
  designation: string;
  siteName: string;
  birthdayDate: string;
  photoUrl?: string;
}

export interface WorkAnniversaryItem {
  employeeId: string;
  employeeName: string;
  designation: string;
  siteName: string;
  monthsCompleted: number;
  photoUrl?: string;
  joiningDate: string;
}

export interface DeviceHistoryLog {
  id: string;
  action: 'BOUND' | 'UNBOUND' | 'RESET';
  timestamp: string;
  actorName: string;
  actorRole: string;
  deviceModel?: string;
  userAgent?: string;
  ipAddress?: string;
  reason?: string;
}

export interface DeviceBinding {
  id: string;
  deviceId: string;
  employeeId: string;
  deviceSignature: string;
  deviceModel?: string;
  platform?: string;
  browserFingerprint?: string;
  status: 'APPROVED' | 'ACTIVE' | 'REVOKED';
  boundAt?: string;
  registeredAt?: string;
  firstUsedAt?: string;
  lastUsedAt?: string;
  revokedAt?: string | null;
  revokedByAdminId?: string | null;
  revocationReason?: string | null;
  userAgent?: string;
  ipAddress?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceRecord {
  id: string;
  employeeId: string;
  installationKey: string;
  status: 'ACTIVE' | 'REVOKED';
  registeredAt: string;
  revokedAt: string | null;
  revokedByAdminId: string | null;
  revocationReason: string | null;
  userAgent: string;
  ipAddress: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GPSCoordinatesWithDistance {
  latitude: number;
  longitude: number;
  accuracy?: number;
  accuracyMeters?: number;
  distanceMeters?: number;
}

export interface AttendanceRecord {
  recordId: string;
  id?: string; // compatibility alias
  employeeId: string;
  employeeName?: string;
  department?: string;
  businessDate: string; // YYYY-MM-DD in IST (authoritative)
  attendanceDate?: string; // alias

  // Immutable Site & Location Snapshots (Fixed permanently at Sign In)
  siteId: string;
  siteNameSnapshot: string;
  locationId: string;
  locationNameSnapshot: string;

  // Shift & Classification
  shiftType: ShiftType;
  isExtraShift: boolean;
  extraShiftType: ExtraShiftType | null;

  // Sign-In Metrics
  signInTime: string | null; // ISO string
  signInCoordinates?: GPSCoordinatesWithDistance | Coordinates | null;
  isLate: boolean;
  lateMinutes?: number;
  lateMarkIndex?: number;
  lateMarkIndexInMonth?: number; // 1-based sequential counter

  // Sign-Out Metrics
  signOutTime: string | null;
  signOutReason: SignOutReason | null;
  signOutCoordinates?: GPSCoordinatesWithDistance | Coordinates | null;
  workingMinutes: number;

  // Status Lifecycles
  sessionStatus: SessionStatus;
  attendanceState: AttendanceState; // compatibility
  attendanceStatus: AttendanceStatus;
  signOutType?: SignOutType | null;
  autoSignOutReason?: string | null;
  autoSignedOutAt?: string | null;
  cutoffTime?: string | null;
  executedAt?: string | null;

  geofenceDistanceMeters?: number;
  locationAccuracyMeters?: number;

  isCorrected: boolean;
  activeCorrectionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceCorrection {
  id: string;
  attendanceRecordId: string;
  employeeId: string;
  employeeName?: string;
  correctedByAdminId: string;
  correctedByAdminName?: string;
  previousAttendanceState: AttendanceState;
  previousAttendanceStatus: AttendanceStatus;
  previousSignInTime: string | null;
  previousSignOutTime: string | null;
  newAttendanceStatus: AttendanceStatus;
  newSignInTime: string | null;
  newSignOutTime: string | null;
  administrativeReason: string;
  createdAt: string;
}

export interface ShiftRuleConfig {
  startTime: string; // "08:00"
  endTime: string; // "17:00"
  gracePeriodMinutes: number; // 15
  autoSignOutTime: string; // "01:00"
}

export interface AttendanceRules {
  id?: string;
  dayShift: ShiftRuleConfig;
  nightShift: ShiftRuleConfig;
  halfDayThresholdHours: number; // 4.0
  fullDayThresholdHours: number; // 9.0
  maxConsecutiveDays?: number; // 6
  weeklyOffRule?: string; // "SUNDAY_MANDATORY"
  updatedBy: string;
  updatedAt: string;
}

export interface WeeklyOffSchedule {
  id: string;
  name: string;
  daysOfWeek: number[]; // 0 = Sunday, 6 = Saturday
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  isMandatory: boolean;
  year: number;
  createdAt: string;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  department?: string;
  leaveType: 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID' | string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedByAdminId: string | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface SecurityEvent {
  id: string;
  employeeId: string;
  employeeName?: string;
  eventType:
    | 'GEOFENCE_BREACH'
    | 'POOR_GPS_ACCURACY'
    | 'DEVICE_MISMATCH'
    | 'UNAUTHORIZED_ATTEMPT'
    | 'VELOCITY_ANOMALY'
    | string;
  details?: Record<string, any>;
  attemptedCoordinates?: Coordinates;
  measuredDistanceMeters?: number;
  allowedRadiusMeters?: number;
  locationName?: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  resolved?: boolean;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: 'admin' | 'system' | 'employee' | string;
  action: string;
  targetId: string;
  details: Record<string, any>;
  ipAddress: string;
  timestamp: string;
}
