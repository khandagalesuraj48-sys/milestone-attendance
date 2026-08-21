import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { LeaveRecord } from '../../src/types';

const COLLECTION = 'leaveRecords';

export const leavesRepository = {
  async getById(id: string): Promise<LeaveRecord | null> {
    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(COLLECTION).doc(id).get();
        if (doc.exists) {
          const leave = { ...doc.data(), id: doc.id } as LeaveRecord;
          storageEngine.setDoc(COLLECTION, id, leave);
          return leave;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const local = storageEngine.getDoc<LeaveRecord>(COLLECTION, id);
    if (local) return local;

    const all = storageEngine.getAllDocs<LeaveRecord>(COLLECTION);
    return all.find((l) => l.id === id) || null;
  },

  async getByEmployeeId(employeeId: string): Promise<LeaveRecord[]> {
    const clean = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .where('employeeId', '==', clean)
          .get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as LeaveRecord));
        for (const l of list) storageEngine.setDoc(COLLECTION, l.id, l);
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.queryDocs<LeaveRecord>(
      COLLECTION,
      (l) => (l.employeeId || '').toUpperCase() === clean
    );
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getAll(): Promise<LeaveRecord[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(COLLECTION).get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as LeaveRecord));
        for (const l of list) storageEngine.setDoc(COLLECTION, l.id, l);
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.getAllDocs<LeaveRecord>(COLLECTION);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async create(leave: LeaveRecord): Promise<LeaveRecord> {
    const docId = leave.id || `leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const docData: LeaveRecord = {
      ...leave,
      id: docId,
      createdAt: leave.createdAt || new Date().toISOString(),
      updatedAt: leave.updatedAt || new Date().toISOString(),
    };

    storageEngine.setDoc(COLLECTION, docId, docData);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(COLLECTION).doc(docId).set(docData);
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return docData;
  },

  async update(id: string, updates: Partial<LeaveRecord>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageEngine.updateDoc(COLLECTION, id, payload);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(COLLECTION).doc(id).set(payload, { merge: true });
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },
};
