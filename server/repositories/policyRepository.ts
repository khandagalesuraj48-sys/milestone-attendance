import { adminDb } from '../firebaseAdmin';
import { AttendanceRules, Holiday } from '../../src/types';

const RULES_DOC_PATH = 'system_settings/attendance_rules';
const HOLIDAYS_COLLECTION = 'holidays';

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
    const doc = await adminDb.doc(RULES_DOC_PATH).get();
    if (!doc.exists) {
      await adminDb.doc(RULES_DOC_PATH).set(defaultAttendanceRules);
      return defaultAttendanceRules;
    }
    return doc.data() as AttendanceRules;
  },

  async updateRules(updates: Partial<AttendanceRules>, updatedBy: string): Promise<AttendanceRules> {
    const current = await this.getRules();
    const merged: AttendanceRules = {
      ...current,
      ...updates,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };
    await adminDb.doc(RULES_DOC_PATH).set(merged);
    return merged;
  },

  async getHolidays(): Promise<Holiday[]> {
    const snap = await adminDb.collection(HOLIDAYS_COLLECTION).get();
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Holiday));
  },

  async setHoliday(holiday: Holiday): Promise<void> {
    await adminDb.collection(HOLIDAYS_COLLECTION).doc(holiday.id).set(holiday);
  },
};
