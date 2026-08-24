import { adminDb } from '../firebaseAdmin';
import { Query } from 'firebase-admin/firestore';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
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
    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(RECORDS_COLLECTION).doc(recordId).get();
        if (doc.exists) {
          const rec = { ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord;
          storageEngine.setDoc(RECORDS_COLLECTION, recordId, rec);
          return rec;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const local = storageEngine.getDoc<AttendanceRecord>(RECORDS_COLLECTION, recordId);
    if (local) return local;

    const all = storageEngine.getAllDocs<AttendanceRecord>(RECORDS_COLLECTION);
    return all.find((r) => r.recordId === recordId || r.id === recordId) || null;
  },

  async getActiveSession(employeeId: string): Promise<AttendanceRecord | null> {
    const clean = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(RECORDS_COLLECTION)
          .where('employeeId', '==', clean)
          .where('sessionStatus', '==', 'OPEN')
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const rec = { ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord;
          storageEngine.setDoc(RECORDS_COLLECTION, doc.id, rec);
          return rec;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return (
      storageEngine.findDoc<AttendanceRecord>(
        RECORDS_COLLECTION,
        (r) => (r.employeeId || '').toUpperCase() === clean && r.sessionStatus === 'OPEN'
      ) || null
    );
  },

  async getByEmployeeAndDate(employeeId: string, businessDate: string): Promise<AttendanceRecord[]> {
    const clean = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(RECORDS_COLLECTION)
          .where('employeeId', '==', clean)
          .where('businessDate', '==', businessDate)
          .get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord));
        for (const r of list) storageEngine.setDoc(RECORDS_COLLECTION, r.recordId || r.id, r);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.queryDocs<AttendanceRecord>(
      RECORDS_COLLECTION,
      (r) => (r.employeeId || '').toUpperCase() === clean && r.businessDate === businessDate
    );
  },

  async getMonthlyForEmployee(employeeId: string, yearMonth: string): Promise<AttendanceRecord[]> {
    const clean = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(RECORDS_COLLECTION)
          .where('employeeId', '==', clean)
          .where('businessDate', '>=', `${yearMonth}-01`)
          .where('businessDate', '<=', `${yearMonth}-31`)
          .get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord));
        for (const r of list) storageEngine.setDoc(RECORDS_COLLECTION, r.recordId || r.id, r);
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.queryDocs<AttendanceRecord>(
      RECORDS_COLLECTION,
      (r) =>
        (r.employeeId || '').toUpperCase() === clean &&
        r.businessDate >= `${yearMonth}-01` &&
        r.businessDate <= `${yearMonth}-31`
    );
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getRecentAutoSignedOut(employeeId: string): Promise<AttendanceRecord | null> {
    const clean = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(RECORDS_COLLECTION)
          .where('employeeId', '==', clean)
          .where('signOutReason', '==', 'EMPLOYEE_FORGOT_SIGN_OUT')
          .orderBy('updatedAt', 'desc')
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const rec = { ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord;
          storageEngine.setDoc(RECORDS_COLLECTION, doc.id, rec);
          return rec;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const matches = storageEngine.queryDocs<AttendanceRecord>(
      RECORDS_COLLECTION,
      (r) => (r.employeeId || '').toUpperCase() === clean && r.signOutReason === 'EMPLOYEE_FORGOT_SIGN_OUT'
    );
    matches.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    return matches[0] || null;
  },

  async queryRecords(filters: AttendanceFilters): Promise<AttendanceRecord[]> {
    if (isRemoteFirestoreActive()) {
      try {
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

        for (const r of results) storageEngine.setDoc(RECORDS_COLLECTION, r.recordId || r.id, r);

        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return results;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    let results = storageEngine.queryDocs<AttendanceRecord>(RECORDS_COLLECTION, (r) => {
      if (filters.employeeId && (r.employeeId || '').toUpperCase() !== filters.employeeId.trim().toUpperCase()) {
        return false;
      }
      if (filters.startDate && r.businessDate < filters.startDate.trim()) {
        return false;
      }
      if (filters.endDate && r.businessDate > filters.endDate.trim()) {
        return false;
      }
      if (filters.month) {
        const cleanMonth = filters.month.trim();
        if (r.businessDate < `${cleanMonth}-01` || r.businessDate > `${cleanMonth}-31`) {
          return false;
        }
      }
      if (filters.date && r.businessDate !== filters.date.trim()) {
        return false;
      }
      if (filters.siteId && r.siteId !== filters.siteId.trim()) {
        return false;
      }
      if (filters.locationId && r.locationId !== filters.locationId.trim()) {
        return false;
      }
      if (filters.shiftType && r.shiftType !== filters.shiftType) {
        return false;
      }
      if (filters.status && r.attendanceStatus !== filters.status) {
        return false;
      }
      if (filters.isExtraShift !== undefined && r.isExtraShift !== filters.isExtraShift) {
        return false;
      }
      if (filters.isAutoSignedOut && !(r.signOutReason === 'EMPLOYEE_FORGOT_SIGN_OUT' || r.attendanceState === 'AUTO_SIGNED_OUT')) {
        return false;
      }
      return true;
    });

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results;
  },

  async getAllOpenSessions(): Promise<AttendanceRecord[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(RECORDS_COLLECTION)
          .where('sessionStatus', '==', 'OPEN')
          .get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), recordId: doc.id, id: doc.id } as AttendanceRecord));
        for (const r of list) storageEngine.setDoc(RECORDS_COLLECTION, r.recordId || r.id, r);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.queryDocs<AttendanceRecord>(
      RECORDS_COLLECTION,
      (r) => r.sessionStatus === 'OPEN'
    );
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

    storageEngine.setDoc(RECORDS_COLLECTION, docId, docData);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(RECORDS_COLLECTION).doc(docId).set(docData);
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return docData;
  },

  async update(recordId: string, updates: Partial<AttendanceRecord>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageEngine.updateDoc(RECORDS_COLLECTION, recordId, payload);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(RECORDS_COLLECTION).doc(recordId).set(payload, { merge: true });
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },

  async createCorrection(correction: AttendanceCorrection): Promise<AttendanceCorrection> {
    const docId = correction.id || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const docData: AttendanceCorrection = {
      ...correction,
      id: docId,
      createdAt: correction.createdAt || new Date().toISOString(),
    };

    storageEngine.setDoc(CORRECTIONS_COLLECTION, docId, docData);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(CORRECTIONS_COLLECTION).doc(docId).set(docData);
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return docData;
  },

  async saveCorrection(correction: AttendanceCorrection): Promise<AttendanceCorrection> {
    return this.createCorrection(correction);
  },

  async getCorrectionsForRecord(recordId: string): Promise<AttendanceCorrection[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(CORRECTIONS_COLLECTION)
          .where('attendanceRecordId', '==', recordId)
          .get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as AttendanceCorrection));
        for (const c of list) storageEngine.setDoc(CORRECTIONS_COLLECTION, c.id, c);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.queryDocs<AttendanceCorrection>(
      CORRECTIONS_COLLECTION,
      (c) => c.attendanceRecordId === recordId
    );
  },
};
