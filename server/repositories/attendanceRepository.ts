import { adminDb } from '../firebaseAdmin';
import { Query } from 'firebase-admin/firestore';
import { AttendanceRecord, AttendanceCorrection, ShiftType, AttendanceStatus } from '../../src/types';

const RECORDS_COLLECTION = 'attendanceRecords';
const CORRECTIONS_COLLECTION = 'attendanceCorrections';

export interface AttendanceFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  employeeId?: string;
  siteId?: string;
  locationId?: string;
  shiftType?: ShiftType;
  status?: AttendanceStatus;
  isExtraShift?: boolean;
  isAutoSignedOut?: boolean;
}

export const attendanceRepository = {
  async getById(recordId: string): Promise<AttendanceRecord | null> {
    const doc = await adminDb.collection(RECORDS_COLLECTION).doc(recordId).get();
    if (!doc.exists) return null;
    return { ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord;
  },

  async getActiveSession(employeeId: string): Promise<AttendanceRecord | null> {
    const clean = employeeId.trim().toUpperCase();
    const snap = await adminDb
      .collection(RECORDS_COLLECTION)
      .where('employeeId', '==', clean)
      .where('sessionStatus', '==', 'OPEN')
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord;
  },

  async getByEmployeeAndDate(employeeId: string, businessDate: string): Promise<AttendanceRecord[]> {
    const clean = employeeId.trim().toUpperCase();
    const snap = await adminDb
      .collection(RECORDS_COLLECTION)
      .where('employeeId', '==', clean)
      .where('businessDate', '==', businessDate)
      .get();
    return snap.docs.map((doc) => ({ ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord));
  },

  async getMonthlyForEmployee(employeeId: string, yearMonth: string): Promise<AttendanceRecord[]> {
    const clean = employeeId.trim().toUpperCase();
    const snap = await adminDb
      .collection(RECORDS_COLLECTION)
      .where('employeeId', '==', clean)
      .where('businessDate', '>=', `${yearMonth}-01`)
      .where('businessDate', '<=', `${yearMonth}-31`)
      .get();
    const list = snap.docs.map((doc) => ({ ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getRecentAutoSignedOut(employeeId: string): Promise<AttendanceRecord | null> {
    const clean = employeeId.trim().toUpperCase();
    const snap = await adminDb
      .collection(RECORDS_COLLECTION)
      .where('employeeId', '==', clean)
      .where('signOutReason', '==', 'EMPLOYEE_FORGOT_SIGN_OUT')
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord;
  },

  async queryRecords(filters: AttendanceFilters): Promise<AttendanceRecord[]> {
    let query: Query = adminDb.collection(RECORDS_COLLECTION);

    if (filters.employeeId) {
      query = query.where('employeeId', '==', filters.employeeId.trim().toUpperCase());
    }
    if (filters.startDate && filters.endDate) {
      query = query.where('businessDate', '>=', filters.startDate.trim()).where('businessDate', '<=', filters.endDate.trim());
    } else if (filters.startDate) {
      query = query.where('businessDate', '>=', filters.startDate.trim());
    } else if (filters.endDate) {
      query = query.where('businessDate', '<=', filters.endDate.trim());
    } else if (filters.month) {
      const cleanMonth = filters.month.trim();
      query = query.where('businessDate', '>=', `${cleanMonth}-01`).where('businessDate', '<=', `${cleanMonth}-31`);
    } else if (filters.date) {
      query = query.where('businessDate', '==', filters.date.trim());
    }
    if (filters.siteId) {
      query = query.where('siteId', '==', filters.siteId.trim());
    }
    if (filters.locationId) {
      query = query.where('locationId', '==', filters.locationId.trim());
    }
    if (filters.shiftType) {
      query = query.where('shiftType', '==', filters.shiftType);
    }
    if (filters.status) {
      query = query.where('attendanceStatus', '==', filters.status);
    }
    if (filters.isExtraShift !== undefined) {
      query = query.where('isExtraShift', '==', filters.isExtraShift);
    }

    const snap = await query.get();
    let results = snap.docs.map((doc) => ({ ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord));

    if (filters.isAutoSignedOut) {
      results = results.filter(
        (r) => r.signOutReason === 'EMPLOYEE_FORGOT_SIGN_OUT' || r.attendanceState === 'AUTO_SIGNED_OUT'
      );
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results;
  },

  async getAllOpenSessions(): Promise<AttendanceRecord[]> {
    const snap = await adminDb
      .collection(RECORDS_COLLECTION)
      .where('sessionStatus', '==', 'OPEN')
      .get();
    return snap.docs.map((doc) => ({ ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord));
  },

  async create(record: AttendanceRecord): Promise<AttendanceRecord> {
    const docId = record.recordId || record.id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const docData: AttendanceRecord = {
      ...record,
      recordId: docId,
      id: docId,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt || new Date().toISOString(),
    };
    await adminDb.collection(RECORDS_COLLECTION).doc(docId).set(docData);
    return docData;
  },

  async update(recordId: string, updates: Partial<AttendanceRecord>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await adminDb.collection(RECORDS_COLLECTION).doc(recordId).set(payload, { merge: true });
  },

  async createCorrection(correction: AttendanceCorrection): Promise<AttendanceCorrection> {
    const docId = correction.id || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const docData: AttendanceCorrection = {
      ...correction,
      id: docId,
      createdAt: correction.createdAt || new Date().toISOString(),
    };
    await adminDb.collection(CORRECTIONS_COLLECTION).doc(docId).set(docData);
    return docData;
  },

  async getCorrectionsForRecord(recordId: string): Promise<AttendanceCorrection[]> {
    const snap = await adminDb
      .collection(CORRECTIONS_COLLECTION)
      .where('attendanceRecordId', '==', recordId)
      .get();
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as AttendanceCorrection));
  },
};
