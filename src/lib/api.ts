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
  ShiftMergeSitePayload,
  MasterRegisterSummary,
  MasterRegisterEntry,
  DeviceResetRequest,
  DeviceBinding,
} from '../types';

const TOKEN_KEY = 'msc_auth_token_v51';

export async function getIdTokenSafe(forceRefresh = false): Promise<string | null> {
  let token = localStorage.getItem(TOKEN_KEY);
  if (token === 'null' || token === 'undefined' || token === '') {
    token = null;
  }

  if (auth.currentUser) {
    try {
      const refreshedToken = await auth.currentUser.getIdToken(forceRefresh);
      if (refreshedToken) {
        token = refreshedToken;
        localStorage.setItem(TOKEN_KEY, token);
      }
    } catch (e: any) {
      console.warn('Firebase getIdToken note:', e?.message || e);
    }
  }
  return token;
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getIdTokenSafe();

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

  // SYSTEM RESET
  async purgeAllData(): Promise<{ success: boolean; message: string }> {
    return request('/api/v1/admin/system/reset-data', {
      method: 'POST',
    });
  },

  // AUTH ENDPOINTS
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

  // COMMON SITES & LOCATIONS
  async getSites(): Promise<{ success: boolean; sites: Site[] }> {
    return request('/api/v1/attendance/sites');
  },

  async getLocations(): Promise<{ success: boolean; locations: LocationSite[] }> {
    return request('/api/v1/attendance/locations');
  },

  // EMPLOYEE ATTENDANCE ENDPOINTS
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
    hasActiveSession: boolean;
    activeSession: AttendanceRecord | null;
    todayRecord: AttendanceRecord | null;
    state: string;
    shiftType: string | null;
    isInsideGeofence?: boolean;
    distanceMeters?: number;
    shiftRules?: any;
  }> {
    return request('/api/v1/attendance/my-today');
  },

  async getMyHistory(params?: string | { startDate?: string; endDate?: string; month?: string }): Promise<{
    success: boolean;
    records: AttendanceRecord[];
    stats?: any;
    period: { startDate: string; endDate: string };
  }> {
    let query = '';
    if (typeof params === 'string') {
      query = `month=${encodeURIComponent(params)}`;
    } else if (params) {
      query = new URLSearchParams(params as any).toString();
    }
    return request(`/api/v1/attendance/my-history?${query}`);
  },

  // EMPLOYEE LEAVES & REGULARIZATION
  async getMyLeaves(): Promise<{ success: boolean; leaves: LeaveRecord[] }> {
    return request('/api/v1/attendance/my-leaves');
  },

  async applyLeave(payload: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    attachmentDataUrl?: string;
    attachmentName?: string;
    attachmentType?: string;
    attachmentSize?: number;
  }): Promise<{ success: boolean; message: string; leave: LeaveRecord }> {
    return request('/api/v1/attendance/my-leaves', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMyLeaveBalance(): Promise<{
    success: boolean;
    balance: any;
    ledger: any[];
  }> {
    return request('/api/v1/attendance/my-leave-balance');
  },

  async getMyRegularizations(): Promise<{ success: boolean; requests: any[] }> {
    return request('/api/v1/attendance/my-regularize');
  },

  async submitRegularization(payload: {
    attendanceDate: string;
    shiftType: string;
    requestedSignInTime: string;
    requestedSignOutTime: string;
    reason: string;
    attendanceRecordId?: string | null;
  }): Promise<{ success: boolean; message: string }> {
    return request('/api/v1/attendance/my-regularize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getNotifications(): Promise<{ success: boolean; notifications: any[] }> {
    return request('/api/v1/attendance/notifications');
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return request(`/api/v1/attendance/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  async getMyDeviceInfo(): Promise<{ success: boolean; isBound: boolean; device: any }> {
    return request('/api/v1/attendance/my-device-info');
  },

  async requestDeviceReset(reason: string): Promise<{ success: boolean; message: string }> {
    return request('/api/v1/attendance/request-device-reset', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async updateProfilePhoto(photoUrl: string): Promise<{ success: boolean; message: string; photoUrl: string; user: User }> {
    return request('/api/v1/attendance/profile-photo', {
      method: 'POST',
      body: JSON.stringify({ photoUrl }),
    });
  },

  async removeProfilePhoto(): Promise<{ success: boolean; message: string; user: User }> {
    return request('/api/v1/attendance/profile-photo', {
      method: 'DELETE',
    });
  },

  // ADMIN ENDPOINTS
  async getAdminOverview(params?: { date?: string; siteId?: string; locationId?: string; department?: string }): Promise<{
    success: boolean;
    stats: any;
    summary?: any;
    siteBreakdown: any[];
    siteBreakdowns?: any[];
    recentRecords: AttendanceRecord[];
    todayRecords?: AttendanceRecord[];
    allEmployees?: Employee[];
    allSites?: Site[];
    allLocations?: LocationSite[];
    securityEvents: SecurityEvent[];
    date: string;
  }> {
    const query = new URLSearchParams(params as any).toString();
    return request(`/api/v1/admin/overview?${query}`);
  },

  // Admin Employees
  async getAdminEmployees(): Promise<{ success: boolean; employees: Employee[] }> {
    return request('/api/v1/admin/employees');
  },

  async getEmployees(): Promise<{ success: boolean; employees: Employee[] }> {
    return this.getAdminEmployees();
  },

  async createEmployee(payload: any): Promise<{ success: boolean; message: string; employee: Employee }> {
    return request('/api/v1/admin/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateEmployee(id: string, payload: Partial<Employee> & { resetHardwareBinding?: boolean }): Promise<{ success: boolean; message: string; employee: Employee }> {
    return request(`/api/v1/admin/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteEmployee(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/v1/admin/employees/${id}`, {
      method: 'DELETE',
    });
  },

  async toggleEmployeeStatus(id: string): Promise<{ success: boolean; message: string; accountStatus: string }> {
    return request(`/api/v1/admin/employees/${id}/toggle-status`, {
      method: 'POST',
    });
  },

  async resetEmployeeDevice(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/v1/admin/employees/${id}/reset-device`, {
      method: 'POST',
    });
  },

  async resetEmployeePassword(id: string, temporaryPassword: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/v1/admin/employees/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ temporaryPassword }),
    });
  },

  // Admin Sites & Projects
  async getAdminSites(): Promise<{ success: boolean; sites: Site[] }> {
    return request('/api/v1/admin/sites');
  },

  async createSite(payload: { siteId: string; siteName: string; isActive?: boolean }): Promise<{ success: boolean; site: Site }> {
    return request('/api/v1/admin/sites', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateSite(id: string, payload: { siteName?: string; isActive?: boolean }): Promise<{ success: boolean; site: Site }> {
    return request(`/api/v1/admin/sites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteSite(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/v1/admin/sites/${id}`, {
      method: 'DELETE',
    });
  },

  async shiftMergeSites(payload: ShiftMergeSitePayload): Promise<{ success: boolean; message: string; migratedEmployeesCount: number; migratedLocationsCount: number }> {
    return request('/api/v1/admin/sites/shift-merge', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Admin Locations
  async getAdminLocations(): Promise<{ success: boolean; locations: LocationSite[] }> {
    return request('/api/v1/admin/locations');
  },

  async createLocation(payload: Partial<LocationSite>): Promise<{ success: boolean; location: LocationSite }> {
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

  async deleteLocation(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/v1/admin/locations/${id}`, {
      method: 'DELETE',
    });
  },

  // Bulk Access
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

  // Admin Attendance & Corrections
  async getAdminAttendance(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    siteId?: string;
    locationId?: string;
    shiftType?: string;
    isExtraShift?: boolean | string;
    status?: string;
  }): Promise<{ success: boolean; records: AttendanceRecord[] }> {
    const query = new URLSearchParams(params as any).toString();
    return request(`/api/v1/admin/attendance?${query}`);
  },

  async correctAttendance(
    payloadOrId: string | {
      recordId: string;
      newStatus?: string;
      newAttendanceStatus?: string;
      newSignInTime?: string | null;
      newSignOutTime?: string | null;
      reason?: string;
      administrativeReason?: string;
    },
    optionalPayload?: {
      newStatus?: string;
      newAttendanceStatus?: string;
      newSignInTime?: string | null;
      newSignOutTime?: string | null;
      reason?: string;
      administrativeReason?: string;
    }
  ): Promise<{ success: boolean; message: string; record: AttendanceRecord }> {
    let body: any = {};
    if (typeof payloadOrId === 'string') {
      body = {
        recordId: payloadOrId,
        newStatus: optionalPayload?.newAttendanceStatus || optionalPayload?.newStatus || 'PRESENT',
        newSignInTime: optionalPayload?.newSignInTime,
        newSignOutTime: optionalPayload?.newSignOutTime,
        reason: optionalPayload?.administrativeReason || optionalPayload?.reason || 'Administrative Correction',
      };
    } else {
      body = {
        recordId: payloadOrId.recordId,
        newStatus: payloadOrId.newAttendanceStatus || payloadOrId.newStatus || 'PRESENT',
        newSignInTime: payloadOrId.newSignInTime,
        newSignOutTime: payloadOrId.newSignOutTime,
        reason: payloadOrId.administrativeReason || payloadOrId.reason || 'Administrative Correction',
      };
    }
    return request('/api/v1/admin/attendance/correct', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Admin Leaves
  async getAdminLeaves(): Promise<{ success: boolean; leaves: LeaveRecord[] }> {
    return request('/api/v1/admin/leaves');
  },

  async getAllLeaves(): Promise<{ success: boolean; leaves: LeaveRecord[] }> {
    return this.getAdminLeaves();
  },

  async getAdminLeaveBalances(): Promise<{ success: boolean; balances: any[] }> {
    return request('/api/v1/admin/leave-balances');
  },

  async reviewLeave(
    id: string,
    statusOrPayload: 'APPROVED' | 'REJECTED' | { status: 'APPROVED' | 'REJECTED'; reviewComment?: string },
    optionalComment?: string
  ): Promise<{ success: boolean; leave: LeaveRecord }> {
    const payload = typeof statusOrPayload === 'string'
      ? { status: statusOrPayload, reviewComment: optionalComment }
      : statusOrPayload;
    return request(`/api/v1/admin/leaves/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Admin Regularization
  async getAdminRegularizations(): Promise<{ success: boolean; requests: any[] }> {
    return request('/api/v1/admin/regularize');
  },

  async reviewRegularization(
    id: string,
    statusOrPayload: 'APPROVED' | 'REJECTED' | { status: 'APPROVED' | 'REJECTED'; reviewComment?: string },
    optionalComment?: string
  ): Promise<{ success: boolean; message: string }> {
    const payload = typeof statusOrPayload === 'string'
      ? { status: statusOrPayload, reviewComment: optionalComment }
      : statusOrPayload;
    return request(`/api/v1/admin/regularize/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Admin Devices & Security
  async getAdminDevices(): Promise<{ success: boolean; devices: DeviceBinding[] }> {
    return request('/api/v1/admin/devices');
  },

  async getAdminDeviceResetRequests(): Promise<{ success: boolean; requests: DeviceResetRequest[] }> {
    return request('/api/v1/admin/devices/reset-requests');
  },

  async reviewDeviceResetRequest(id: string, payload: { status: 'APPROVED' | 'REJECTED'; reviewNotes?: string }): Promise<{ success: boolean; message: string }> {
    return request(`/api/v1/admin/devices/reset-requests/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Admin Policies
  async getAdminPolicy(): Promise<{ success: boolean; rules: AttendanceRules }> {
    return request('/api/v1/admin/policy');
  },

  async updateAdminPolicy(rules: Partial<AttendanceRules>): Promise<{ success: boolean; rules: AttendanceRules }> {
    return request('/api/v1/admin/policy', {
      method: 'PUT',
      body: JSON.stringify(rules),
    });
  },

  // Security Events & Audit Logs
  async getAdminSecurityEvents(): Promise<{ success: boolean; events: SecurityEvent[] }> {
    return request('/api/v1/admin/security-events');
  },

  async getSecurityEvents(): Promise<{ success: boolean; events: SecurityEvent[] }> {
    return this.getAdminSecurityEvents();
  },

  async getAdminAuditLogs(): Promise<{ success: boolean; logs: AuditLog[] }> {
    return request('/api/v1/admin/audit-logs');
  },

  async getAuditLogs(): Promise<{ success: boolean; logs: AuditLog[] }> {
    return this.getAdminAuditLogs();
  },

  // Reports
  async getAdminReports(params?: { month?: string; startDate?: string; endDate?: string; department?: string; siteId?: string }): Promise<{
    success: boolean;
    report: any[];
    period: { startDate: string; endDate: string };
    totalEmployees: number;
  }> {
    const query = new URLSearchParams(params as any).toString();
    return request(`/api/v1/admin/reports?${query}`);
  },

  async getAdminReport(params?: { month?: string; startDate?: string; endDate?: string; department?: string; siteId?: string }): Promise<{
    success: boolean;
    report: any[];
    period: { startDate: string; endDate: string };
    totalEmployees: number;
  }> {
    return this.getAdminReports(params);
  },

  // Master Attendance Register
  async getMasterRegister(month: string): Promise<{ success: boolean; summary: MasterRegisterSummary | null }> {
    return request(`/api/v1/admin/master-register/${month}`);
  },

  async generateMasterRegister(month: string): Promise<{ success: boolean; summary: MasterRegisterSummary }> {
    return request('/api/v1/admin/master-register/generate', {
      method: 'POST',
      body: JSON.stringify({ month }),
    });
  },

  // Scheduler Triggers
  async triggerSchedulerDay(): Promise<{ success: boolean; worker: string; modifiedCount: number; processedIds: string[] }> {
    return request('/api/v1/admin/scheduler/day', { method: 'POST' });
  },

  async triggerSchedulerNight(): Promise<{ success: boolean; worker: string; modifiedCount: number; processedIds: string[] }> {
    return request('/api/v1/admin/scheduler/night', { method: 'POST' });
  },

  // Device & Profile Aliases
  async getMyDevice(): Promise<{ success: boolean; isBound: boolean; device: any; boundHardwareSignature?: string | null }> {
    const res = await this.getMyDeviceInfo();
    return {
      success: res.success,
      isBound: res.isBound,
      device: res.device,
      boundHardwareSignature: res.device?.hardwareSignature || null,
    };
  },

  async getMyProfile(): Promise<{ success: boolean; user: User; employee: Employee | null; assignedSites: Site[] }> {
    return request('/api/v1/attendance/my-profile');
  },

  async uploadProfilePhoto(fileOrBase64: File | Blob | string): Promise<{ success: boolean; message: string; photoUrl: string; user: User }> {
    let photoUrl = '';
    if (typeof fileOrBase64 === 'string') {
      photoUrl = fileOrBase64;
    } else {
      photoUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrBase64);
      });
    }
    return this.updateProfilePhoto(photoUrl);
  },

  async deleteProfilePhoto(): Promise<{ success: boolean; message: string; user: User }> {
    return this.removeProfilePhoto();
  },

  async markAllNotificationsRead(): Promise<{ success: boolean; message: string }> {
    return request('/api/v1/attendance/notifications/mark-all-read', { method: 'POST' });
  },

  async submitLeave(payload: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentType?: string | null;
    attachmentSize?: number | null;
    attachmentId?: string | null;
  }): Promise<{ success: boolean; message: string; leave: LeaveRecord }> {
    return this.applyLeave({
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      reason: payload.reason,
      attachmentDataUrl: payload.attachmentUrl || undefined,
      attachmentName: payload.attachmentName || undefined,
      attachmentType: payload.attachmentType || undefined,
      attachmentSize: payload.attachmentSize || undefined,
    });
  },

  async requestRegularization(payload: {
    attendanceDate: string;
    shiftType: string;
    requestedSignInTime: string;
    requestedSignOutTime: string;
    reason: string;
    attendanceRecordId?: string | null;
  }): Promise<{ success: boolean; message: string }> {
    return this.submitRegularization(payload);
  },

  async uploadFile(file: File, purpose: string = 'general'): Promise<{ success: boolean; file: { url: string; fileName: string; fileType: string; fileSize: number; id: string } }> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return {
      success: true,
      file: {
        url: dataUrl,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        id: `att_${Date.now()}`,
      },
    };
  },

  async fetchAuthenticatedBlob(url: string): Promise<{ objectUrl: string; fileName?: string; contentType?: string }> {
    if (url.startsWith('data:')) {
      const mime = url.match(/^data:(.*?);base64/)?.[1] || 'application/octet-stream';
      const byteCharacters = atob(url.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });
      return {
        objectUrl: URL.createObjectURL(blob),
        contentType: mime,
      };
    }
    const token = await getIdTokenSafe();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const blob = await response.blob();
    return {
      objectUrl: URL.createObjectURL(blob),
      contentType: blob.type,
    };
  },

  async downloadFile(url: string, filename: string): Promise<void> {
    const { objectUrl } = await this.fetchAuthenticatedBlob(url);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    }, 200);
  },

  async getAuthenticatedFileUrl(url: string): Promise<string> {
    if (url.startsWith('data:')) return url;
    return url;
  },
};
