// Milestone Consultancy API Client — Firebase Auth & Firestore Native

import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { getOrCreateInstallationKey } from './device';
import {
  User,
  Employee,
  AttendanceRecord,
  Site,
  LocationSite,
  AttendanceRules,
  LeaveRecord,
  SecurityEvent,
  AuditLog,
} from '../types';

const TOKEN_KEY = 'msc_auth_token_v51';

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = localStorage.getItem(TOKEN_KEY);

  // Validate format of token in storage
  if (token === 'null' || token === 'undefined' || token === '') {
    token = null;
    localStorage.removeItem(TOKEN_KEY);
  }

  // If currentUser exists in Firebase Auth, refresh token to avoid expiry
  if (auth.currentUser) {
    try {
      const refreshedToken = await auth.currentUser.getIdToken();
      if (refreshedToken) {
        token = refreshedToken;
        localStorage.setItem(TOKEN_KEY, token);
      }
    } catch (e) {
      console.warn('Failed to refresh Firebase ID token:', e);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && token.trim().length > 0) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const rawText = await res.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      data = {
        success: false,
        error: res.statusText || 'SERVER_ERROR',
        message: rawText && !rawText.startsWith('<') ? rawText : `Server responded with status ${res.status}`,
      };
    }
  }

  if (!res.ok) {
    // If token is rejected or invalid, clear local token to prevent cascading failure loops
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    const error = new Error(data.message || data.error || 'Server error occurred');
    (error as any).status = res.status;
    (error as any).data = data;
    throw error;
  }
  return data as T;
}

export const api = {
  getToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || token === 'null' || token === 'undefined') return null;
    return token;
  },

  setToken(token: string) {
    if (token && token !== 'null' && token !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  request,

  // Auth Endpoints
  async login(usernameOrEmail: string, password: string): Promise<{ token: string; user: User }> {
    const installationKey = getOrCreateInstallationKey();
    const cleanInput = usernameOrEmail.trim();

    // 1. Resolve Firebase Auth email from username if not already an email
    let email = cleanInput;
    if (!cleanInput.includes('@')) {
      try {
        const resolveRes = await fetch('/api/v1/auth/resolve-identity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanInput }),
        });
        const resolveData = await resolveRes.json();
        if (resolveData.success && resolveData.email) {
          email = resolveData.email;
        } else {
          email = `${cleanInput.toLowerCase()}@milestoneconsultancy.in`;
        }
      } catch {
        email = `${cleanInput.toLowerCase()}@milestoneconsultancy.in`;
      }
    }

    // 2. Authoritative client authentication via Firebase Authentication SDK
    let idToken: string;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      idToken = await userCredential.user.getIdToken(true);
      this.setToken(idToken);
    } catch (authErr: any) {
      const code = authErr?.code || '';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-email'
      ) {
        throw new Error('Invalid username or password. Please verify your credentials.');
      } else if (code === 'auth/too-many-requests') {
        throw new Error('Access temporarily disabled due to multiple failed login attempts. Please try again later.');
      } else if (code === 'auth/user-disabled') {
        throw new Error('This account has been deactivated. Please contact your system administrator.');
      } else {
        throw new Error(authErr.message || 'Authentication failed. Please verify your credentials.');
      }
    }

    // 3. Post-auth session initialization: validate device binding and load user profile
    const sessionRes = await request<{ success: boolean; user: User; message: string }>(
      '/api/v1/auth/session-init',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ installationKey }),
      }
    );

    return {
      token: idToken,
      user: sessionRes.user,
    };
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    return request<{ success: boolean; user: User }>('/api/v1/auth/me');
  },

  async changePassword(newPassword: string, confirmPassword?: string): Promise<{ success: boolean; user: User; message: string }> {
    return request<{ success: boolean; user: User; message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, confirmPassword }),
    });
  },

  async logout(): Promise<void> {
    try {
      await request('/api/v1/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      try {
        await signOut(auth);
      } catch {}
      this.clearToken();
    }
  },

  // Common Sites & Locations
  async getSites(): Promise<{ success: boolean; sites: Site[] }> {
    return request('/api/v1/sites');
  },

  async getLocations(): Promise<{ success: boolean; locations: LocationSite[] }> {
    return request('/api/v1/locations');
  },

  // Employee Attendance Endpoints
  async punchIn(payload: {
    shiftType: 'DAY' | 'NIGHT';
    latitude: number;
    longitude: number;
    accuracy: number;
    siteId: string;
    locationId: string;
  }): Promise<{ success: boolean; message: string; record?: AttendanceRecord; attendance?: AttendanceRecord }> {
    const installationKey = getOrCreateInstallationKey();
    const res = await request('/api/v1/attendance/punch-in', {
      method: 'POST',
      body: JSON.stringify({ ...payload, installationKey }),
    });
    return {
      success: true,
      message: res.message,
      record: res.record || res.attendance,
      attendance: res.record || res.attendance,
    };
  },

  async punchOut(payload: {
    latitude: number;
    longitude: number;
    accuracy: number;
  }): Promise<{ success: boolean; message: string; record?: AttendanceRecord; attendance?: AttendanceRecord }> {
    const installationKey = getOrCreateInstallationKey();
    const res = await request('/api/v1/attendance/punch-out', {
      method: 'POST',
      body: JSON.stringify({ ...payload, installationKey }),
    });
    return {
      success: true,
      message: res.message,
      record: res.record || res.attendance,
      attendance: res.record || res.attendance,
    };
  },

  async getMyToday(): Promise<{
    success: boolean;
    date: string;
    shifts: AttendanceRecord[];
    activeSession: AttendanceRecord | null;
    recentAutoSignOutNotice: { shiftType: string; businessDate?: string; date?: string; message: string } | null;
  }> {
    return request('/api/v1/attendance/my-today');
  },

  async getMyHistory(month?: string): Promise<{
    success: boolean;
    month: string;
    records: AttendanceRecord[];
    stats?: {
      totalDaysRecorded: number;
      lateCountInMonth: number;
      fullDays: number;
      halfDays: number;
      absentDays: number;
      extraNights: number;
    };
  }> {
    const url = month ? `/api/v1/attendance/my-history?month=${month}` : '/api/v1/attendance/my-history';
    return request(url);
  },

  async submitLeave(payload: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentType?: string | null;
  }): Promise<{ success: boolean; message: string; leave: LeaveRecord }> {
    return request('/api/v1/attendance/leaves', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMyLeaveBalance(): Promise<{ success: boolean; balance: any; ledger: any[] }> {
    return request('/api/v1/attendance/leaves/balance');
  },

  async getNotifications(): Promise<{ success: boolean; notifications: any[] }> {
    return request('/api/v1/attendance/notifications');
  },

  async markNotificationRead(id: string): Promise<any> {
    return request(`/api/v1/attendance/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllNotificationsRead(): Promise<any> {
    return request('/api/v1/attendance/notifications/mark-all-read', { method: 'POST' });
  },

  async submitRegularization(payload: {
    attendanceDate: string;
    shiftType: string;
    requestedSignInTime: string;
    requestedSignOutTime: string;
    reason: string;
    attendanceRecordId?: string | null;
    supportingDocUrl?: string | null;
  }): Promise<{ success: boolean; message: string; request: any }> {
    return request('/api/v1/attendance/regularize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async requestRegularization(payload: {
    attendanceDate: string;
    shiftType: string;
    requestedSignInTime: string;
    requestedSignOutTime: string;
    reason: string;
    attendanceRecordId?: string | null;
    supportingDocUrl?: string | null;
  }): Promise<{ success: boolean; message: string; request: any }> {
    return this.submitRegularization(payload);
  },

  async getMyRegularizations(): Promise<{ success: boolean; requests: any[] }> {
    return request('/api/v1/attendance/regularize/my-requests');
  },

  async getAdminRegularizations(): Promise<{ success: boolean; requests: any[] }> {
    return request('/api/v1/admin/regularize');
  },

  async reviewRegularization(id: string, status: 'APPROVED' | 'REJECTED', reviewComment?: string): Promise<any> {
    return request(`/api/v1/admin/regularize/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, reviewComment }),
    });
  },

  async bulkAssignAccess(payload: {
    employeeIds: string[];
    targetType: 'PROJECT_SITE' | 'LOCATION';
    targetId: string;
    action: 'ASSIGN' | 'REMOVE';
  }): Promise<{ success: boolean; message: string; modifiedCount: number }> {
    return request('/api/v1/admin/access/bulk-assign', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getHolidays(year?: number): Promise<{ success: boolean; holidays: any[] }> {
    return request('/api/v1/attendance/holidays');
  },

  async getAdminHolidays(): Promise<{ success: boolean; holidays: any[] }> {
    return request('/api/v1/admin/holidays');
  },

  async createHoliday(payload: { name: string; date: string; isMandatory?: boolean; description?: string }): Promise<any> {
    return request('/api/v1/admin/holidays', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateHoliday(id: string, payload: any): Promise<any> {
    return request(`/api/v1/admin/holidays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteHoliday(id: string): Promise<any> {
    return request(`/api/v1/admin/holidays/${id}`, {
      method: 'DELETE',
    });
  },

  async getAdminLeaveBalances(): Promise<{ success: boolean; balances: any[] }> {
    return request('/api/v1/admin/leaves/balances');
  },

  async deleteSite(id: string): Promise<any> {
    return request(`/api/v1/admin/sites/${id}`, { method: 'DELETE' });
  },

  async deleteLocation(id: string): Promise<any> {
    return request(`/api/v1/admin/locations/${id}`, { method: 'DELETE' });
  },

  async getMyLeaves(): Promise<{ success: boolean; leaves: LeaveRecord[] }> {
    return request('/api/v1/attendance/leaves');
  },

  async getMyProfile(): Promise<{
    success: boolean;
    user: User;
    employee?: Employee;
    assignedSites?: Site[];
  }> {
    return request('/api/v1/attendance/my-profile');
  },

  async getTeamFeed(): Promise<{
    success: boolean;
    newTeamMembers: Array<{
      employeeId: string;
      employeeName: string;
      designation: string;
      siteName: string;
      photoUrl?: string;
      joiningDate?: string;
    }>;
    upcomingBirthdays: Array<{
      employeeId: string;
      employeeName: string;
      designation: string;
      siteName: string;
      birthdayDate: string;
      photoUrl?: string;
    }>;
    workAnniversaries: Array<{
      employeeId: string;
      employeeName: string;
      designation: string;
      siteName: string;
      monthsCompleted: number;
      photoUrl?: string;
      joiningDate: string;
    }>;
    myMilestone: { months: number; text: string } | null;
  }> {
    return request('/api/v1/attendance/team-feed');
  },

  async uploadProfilePhoto(photoUrl: string): Promise<{ success: boolean; photoUrl: string; user: User }> {
    return request('/api/v1/attendance/profile-photo', {
      method: 'POST',
      body: JSON.stringify({ photoUrl }),
    });
  },

  async deleteProfilePhoto(): Promise<{ success: boolean; user: User }> {
    return request('/api/v1/attendance/profile-photo', {
      method: 'DELETE',
    });
  },

  // Admin Endpoints
  async getAdminOverview(params?: {
    date?: string;
    siteId?: string;
    locationId?: string;
    department?: string;
  }): Promise<{
    success: boolean;
    todayDate: string;
    summary: Record<string, number>;
    siteBreakdowns?: any[];
    todayRecords?: AttendanceRecord[];
    allEmployees?: Employee[];
    allSites?: Site[];
    allLocations?: LocationSite[];
  }> {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.siteId && params.siteId !== 'ALL') query.set('siteId', params.siteId);
    if (params?.locationId && params.locationId !== 'ALL') query.set('locationId', params.locationId);
    if (params?.department && params.department !== 'ALL') query.set('department', params.department);
    const qs = query.toString();
    return request(qs ? `/api/v1/admin/overview?${qs}` : '/api/v1/admin/overview');
  },

  async getEmployee(id: string): Promise<{ success: boolean; employee: Employee }> {
    return request(`/api/v1/admin/employees/${id}`);
  },

  async getAdminSites(): Promise<{ success: boolean; sites: (Site & { locationsCount: number; assignedEmployeesCount: number })[] }> {
    return request('/api/v1/admin/sites');
  },

  async createSite(payload: { siteId?: string; siteName: string }): Promise<{ success: boolean; site: Site }> {
    return request('/api/v1/admin/sites', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateSite(id: string, payload: Partial<Site>): Promise<{ success: boolean; site: Site }> {
    return request(`/api/v1/admin/sites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getAdminLocations(): Promise<{ success: boolean; locations: LocationSite[] }> {
    return request('/api/v1/admin/locations');
  },

  async createLocation(payload: {
    siteId: string;
    locationName: string;
    address?: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    accuracyThresholdMeters?: number;
  }): Promise<{ success: boolean; location: LocationSite }> {
    return request('/api/v1/admin/locations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateLocation(id: string, payload: Partial<LocationSite>): Promise<{ success: boolean; location: LocationSite }> {
    return request(`/api/v1/admin/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getEmployees(): Promise<{ success: boolean; employees: any[] }> {
    return request('/api/v1/admin/employees');
  },

  async createEmployee(payload: any): Promise<{ success: boolean; message: string; employee: any }> {
    return request('/api/v1/admin/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateEmployee(id: string, payload: any): Promise<{ success: boolean; employee: any }> {
    return request(`/api/v1/admin/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async resetEmployeePassword(id: string, temporaryPassword?: string): Promise<any> {
    return request(`/api/v1/admin/employees/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ temporaryPassword }),
    });
  },

  async resetEmployeeDevice(id: string): Promise<any> {
    return request(`/api/v1/admin/employees/${id}/reset-device`, {
      method: 'POST',
    });
  },

  async getDeviceHistory(id: string): Promise<{
    success: boolean;
    employeeId: string;
    employeeName: string;
    currentStatus: 'BOUND' | 'UNBOUND';
    unbindCount: number;
    activeDevice: any;
    history: any[];
  }> {
    return request(`/api/v1/admin/employees/${id}/device-history`);
  },

  async getAdminAttendance(params?: {
    date?: string;
    employeeId?: string;
    siteId?: string;
    locationId?: string;
    shiftType?: string;
    status?: string;
    isExtraShift?: string;
    isAutoSignedOut?: string;
  }): Promise<{ success: boolean; count: number; records: AttendanceRecord[] }> {
    const query = new URLSearchParams(params as any).toString();
    return request(`/api/v1/admin/attendance?${query}`);
  },

  // Alias for compatibility
  async getAdminRegister(params?: any): Promise<{ success: boolean; count: number; records: AttendanceRecord[] }> {
    return this.getAdminAttendance(params);
  },

  async correctAttendance(recordId: string, payload: {
    newAttendanceStatus: string;
    newSignInTime?: string;
    newSignOutTime?: string;
    administrativeReason: string;
  }): Promise<{ success: boolean; message: string; record: AttendanceRecord }> {
    return request(`/api/v1/admin/attendance/${recordId}/correct`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getRules(): Promise<{ success: boolean; rules: AttendanceRules }> {
    return request('/api/v1/admin/rules');
  },

  async updateRules(payload: Partial<AttendanceRules>): Promise<{ success: boolean; rules: AttendanceRules }> {
    return request('/api/v1/admin/rules', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getAllLeaves(): Promise<{ success: boolean; leaves: LeaveRecord[] }> {
    return request('/api/v1/admin/leaves');
  },

  async reviewLeave(id: string, status: 'APPROVED' | 'REJECTED', reviewComment?: string): Promise<any> {
    return request(`/api/v1/admin/leaves/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewComment }),
    });
  },

  async getSecurityEvents(): Promise<{ success: boolean; events: SecurityEvent[] }> {
    return request('/api/v1/admin/security-events');
  },

  async getAuditLogs(): Promise<{ success: boolean; logs: AuditLog[] }> {
    return request('/api/v1/admin/audit-logs');
  },

  async getAdminReport(month?: string, department?: string): Promise<{ success: boolean; month: string; report: any[] }> {
    const query = new URLSearchParams();
    if (month) query.set('month', month);
    if (department && department !== 'ALL') query.set('department', department);
    return request(`/api/v1/admin/reports?${query.toString()}`);
  },

  // Cloud Scheduler triggers
  async triggerSchedulerDay(): Promise<any> {
    return request('/api/v1/internal/auto-sign-out/day', { method: 'POST' });
  },

  async triggerSchedulerNight(): Promise<any> {
    return request('/api/v1/internal/auto-sign-out/night', { method: 'POST' });
  },
};
