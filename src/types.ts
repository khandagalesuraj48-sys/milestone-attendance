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

export interface BankDetails {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  uanNumber?: string;
}

export interface SalaryStructure {
  monthlyGross: number;
  monthlyGrossCtc?: number; // Alias for monthlyGross
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  conveyanceAllowance?: number;
  medicalAllowance?: number;
  otherAllowances?: number;
  
  // Deductions Config
  pfApplicable?: boolean;
  pfDeductionType?: 'PERCENTAGE' | 'FIXED' | 'EXEMPT';
  pfPercentage?: number;
  pfRatePercent?: number; // default 12
  pfFixedAmount?: number;
  ptApplicable?: boolean; // Professional Tax
  ptDeductionEnabled?: boolean;
  ptState?: string;
  ptStateSlab?: string;
  ptFixedAmount?: number;
  tdsMonthly?: number;
  tdsMonthlyAmount?: number;
  otherDeductions?: number;
  
  // Bank & Tax Details
  effectiveFrom?: string;
  bankDetails?: BankDetails;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  uanNumber?: string;
  pfNumber?: string;
  paymentMode?: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH';
}

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
  reportingManagerId?: string | null;
  reportingManagerName?: string | null;
  salaryStructure?: SalaryStructure;
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
  employeeNameSnapshot?: string;
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
  adminCorrectionReason?: string;
  adminCorrectionBy?: string;
  adminCorrectionAt?: string;
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
  isActive?: boolean;
  description?: string;
  createdAt: string;
  updatedAt?: string;
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
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
  attachmentId?: string | null;
  paidDays?: number;
  unpaidDays?: number;
  reviewedByAdminId: string | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface LeaveBalance {
  employeeId: string;
  employeeName?: string;
  department?: string;
  openingBalance: number;
  monthlyEntitlement: number; // +2 days per month
  carryForward: number;
  paidUsed: number;
  paidRemaining: number;
  approvedUnpaid: number;
  currentBalance?: number; // alias for paidRemaining
  usedLeaves?: number; // alias for paidUsed
  unpaidLeaves?: number; // alias for approvedUnpaid
  creditedMonths: string[]; // e.g. ["2026-01", "2026-02"]
  ledger?: LeaveLedgerEntry[];
  updatedAt: string;
}

export interface LeaveLedgerEntry {
  id: string;
  employeeId: string;
  employeeName?: string;
  type?: 'OPENING' | 'MONTHLY_ENTITLEMENT' | 'LEAVE_DEBIT' | 'LEAVE_REVERSAL' | 'ADMIN_ADJUSTMENT';
  entryType?: string; // alias for display
  amount?: number; // positive or negative
  changeAmount?: number; // alias for amount
  balanceAfter: number;
  month?: string; // YYYY-MM
  date?: string; // YYYY-MM-DD or display
  leaveId?: string;
  note?: string;
  description?: string; // alias for note
  createdAt: string;
}

export interface AttendanceRegularizationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  attendanceRecordId?: string | null;
  attendanceDate: string; // YYYY-MM-DD
  shiftType: ShiftType;
  requestedSignInTime: string; // HH:mm or ISO
  requestedSignOutTime: string; // HH:mm or ISO
  reason: string;
  supportingDocUrl?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedByAdminId?: string | null;
  reviewedByAdminName?: string | null;
  reviewComment?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  employeeId: string; // Employee ID or 'ALL' or 'ADMIN'
  type: 'ATTENDANCE_ERROR' | 'REGULARIZATION' | 'LEAVE_STATUS' | 'ANNOUNCEMENT' | 'INFO' | 'SECURITY_ALERT';
  title: string;
  message: string;
  date: string; // YYYY-MM-DD or ISO
  read: boolean;
  actionType?: 'REGULARIZE_ATTENDANCE' | 'VIEW_LEAVE' | 'VIEW_ATTENDANCE' | 'OPEN_DRAWER' | 'VIEW_PROFILE';
  actionPayload?: {
    date?: string;
    recordId?: string;
    leaveId?: string;
    shiftType?: ShiftType;
    reason?: string;
  };
  createdAt: string;
}

export interface BulkAccessAssignmentParams {
  employeeIds: string[];
  targetType: 'PROJECT_SITE' | 'LOCATION';
  targetId: string;
  action: 'ASSIGN' | 'REMOVE';
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

export type PayrollStatus = 'DRAFT' | 'FINALIZED' | 'PUBLISHED';

export type MasterRegisterStatus = 'DRAFT' | 'SUBMITTED' | 'FINALIZED' | 'REOPENED';

export interface DayWiseAttendanceEntry {
  date: string; // YYYY-MM-DD
  dayName: string; // Mon, Tue, etc.
  status: AttendanceStatus | 'PRESENT' | 'HOLIDAY_WORKED' | 'REST_DAY';
  shiftType?: ShiftType;
  isExtraShift?: boolean;
  signInTime?: string | null;
  signOutTime?: string | null;
  workingMinutes?: number;
  isLate?: boolean;
  isRegularized?: boolean;
  notes?: string;
}

export interface MasterRegisterEntry {
  id: string; // unique ID e.g. mr_2026-08_EMP001
  month: string; // YYYY-MM
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  siteId?: string;
  siteName?: string;
  joiningDate?: string;
  
  totalDaysInMonth: number;
  totalWorkingDays: number;
  
  // Attendance metrics (Actual vs Final)
  actualPresentDays: number;
  actualAbsentDays: number;
  adminFinalPresentDays: number;
  adminFinalAbsentDays: number;
  
  paidLeaves: number;
  unpaidLeaves: number;
  leaveBalance: number;
  holidays: number;
  holidaysWorked: number;
  weeklyOffs: number;
  lateMarksCount: number;
  halfDaysCount: number;
  extraDaysCount: number;
  extraNightsCount: number;
  totalPayableDays: number;
  
  status: MasterRegisterStatus;
  adminNotes?: string;
  lastModifiedByAdminId?: string;
  lastModifiedByAdminName?: string;
  lastModifiedAt?: string;
  dayWiseBreakdown?: DayWiseAttendanceEntry[];
}

export interface MasterRegisterSummary {
  month: string; // YYYY-MM
  status: MasterRegisterStatus;
  totalEmployees: number;
  finalizedCount: number;
  totalPayableDays: number;
  submittedAt?: string | null;
  submittedBy?: string | null;
  finalizedAt?: string | null;
  finalizedBy?: string | null;
  reopenedAt?: string | null;
  reopenedBy?: string | null;
  entries: MasterRegisterEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface SalaryStructureVersion extends SalaryStructure {
  versionId: string;
  employeeId: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string | null; // YYYY-MM-DD or null for active
  createdByAdminId: string;
  createdAt: string;
}

export interface PayrollItem {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  joiningDate?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  uanNumber?: string;
  
  month: string; // YYYY-MM
  totalDaysInMonth: number;
  workingDaysInMonth: number;
  
  // Attendance Breakdown
  presentFullDays: number;
  presentHalfDays: number;
  paidLeaves: number;
  unpaidLeaves: number;
  weeklyOffs: number;
  paidHolidays: number;
  absentDays: number;
  lateDays: number;
  lateDeductionDays: number;
  extraNightShifts: number;
  extraNightAllowanceRate?: number;
  
  paidDays: number;
  lopDays: number;
  
  // Fixed Structure
  grossSalary: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  
  // Earned Prorated Components
  earnedBasic: number;
  earnedHra: number;
  earnedSpecialAllowance: number;
  earnedConveyance: number;
  earnedMedical: number;
  earnedOtherAllowances: number;
  extraNightBonus: number;
  incentivesBonus: number;
  totalGrossEarned: number;
  
  // Deductions
  pfDeduction: number;
  ptDeduction: number;
  tdsDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  
  // Net
  netSalary: number;
  netSalaryInWords: string;
  
  paymentStatus: 'UNPAID' | 'PAID' | 'ON_HOLD';
  paidOn?: string;
  remarks?: string;
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  id: string;
  month: string; // YYYY-MM
  status: PayrollStatus;
  totalEmployees: number;
  totalGrossAmount: number;
  totalDeductionsAmount: number;
  totalNetAmount: number;
  generatedByAdminId: string;
  generatedByAdminName: string;
  finalizedAt?: string | null;
  finalizedBy?: string | null;
  publishedAt?: string | null;
  publishedBy?: string | null;
  items?: PayrollItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SalarySlip extends PayrollItem {
  companyName: string;
  companyAddress: string;
  companyLogoUrl?: string;
  slipNumber: string;
}

export interface ProjectShiftParams {
  sourceSiteId: string;
  targetSiteId: string;
  shiftEmployees: boolean;
  shiftLocations: boolean;
  deactivateSourceSiteAfterShift: boolean;
}

export type ShiftMergeSitePayload = ProjectShiftParams;

export type DeviceResetRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DeviceResetRequest {
  id: string;
  requestId?: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  designation?: string;
  reason: string;
  currentDeviceId?: string | null;
  currentHardwareSignature?: string | null;
  status: DeviceResetRequestStatus;
  requestedAt: string;
  reviewedByAdminId?: string | null;
  reviewedByAdminName?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}


