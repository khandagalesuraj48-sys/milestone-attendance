import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { AttendanceRules } from '../../src/types';

const SETTINGS_COLLECTION = 'system_settings';
const RULES_DOC_ID = 'attendance_rules';

export const defaultAttendanceRules: AttendanceRules = {
  dayShift: {
    startTime: '08:00',
    endTime: '17:00',
    gracePeriodMinutes: 15,
    autoSignOutTime: '01:00',
  },
  nightShift: {
    startTime: '19:00',
    endTime: '04:00',
    gracePeriodMinutes: 15,
    autoSignOutTime: '08:00',
  },
  halfDayThresholdHours: 4.0,
  fullDayThresholdHours: 9.0,
  maxConsecutiveDays: 6,
  weeklyOffRule: 'SUNDAY_MANDATORY',
  updatedBy: 'SYSTEM_BOOTSTRAP',
  updatedAt: new Date().toISOString(),
};

export const policyRepository = {
  async getRules(): Promise<AttendanceRules> {
    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(SETTINGS_COLLECTION).doc(RULES_DOC_ID).get();
        if (doc.exists) {
          const rules = doc.data() as AttendanceRules;
          storageEngine.setDoc(SETTINGS_COLLECTION, RULES_DOC_ID, rules);
          return rules;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const local = storageEngine.getDoc<AttendanceRules>(SETTINGS_COLLECTION, RULES_DOC_ID);
    if (local) return local;

    storageEngine.setDoc(SETTINGS_COLLECTION, RULES_DOC_ID, defaultAttendanceRules);
    return defaultAttendanceRules;
  },

  async updateRules(updates: Partial<AttendanceRules>, updatedBy: string): Promise<AttendanceRules> {
    const current = await this.getRules();
    const merged: AttendanceRules = {
      ...current,
      ...updates,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };

    storageEngine.setDoc(SETTINGS_COLLECTION, RULES_DOC_ID, merged);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(SETTINGS_COLLECTION).doc(RULES_DOC_ID).set(merged);
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return merged;
  },

  async saveRules(rules: AttendanceRules): Promise<AttendanceRules> {
    return this.updateRules(rules, rules.updatedBy || 'admin');
  },
};
