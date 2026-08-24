import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { AttendanceRegularizationRequest } from '../../src/types';

const REGULARIZATIONS_COLLECTION = 'regularization_requests';

export const regularizationRepository = {
  async getById(id: string): Promise<AttendanceRegularizationRequest | null> {
    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(REGULARIZATIONS_COLLECTION).doc(id).get();
        if (doc.exists) {
          const req = { ...doc.data(), id: doc.id } as AttendanceRegularizationRequest;
          storageEngine.setDoc(REGULARIZATIONS_COLLECTION, id, req);
          return req;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const local = storageEngine.getDoc<AttendanceRegularizationRequest>(REGULARIZATIONS_COLLECTION, id);
    if (local) return local;

    const all = storageEngine.getAllDocs<AttendanceRegularizationRequest>(REGULARIZATIONS_COLLECTION);
    return all.find((r) => r.id === id) || null;
  },

  async getByEmployeeId(employeeId: string): Promise<AttendanceRegularizationRequest[]> {
    const cleanId = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(REGULARIZATIONS_COLLECTION).get();
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AttendanceRegularizationRequest));
        for (const r of list) storageEngine.setDoc(REGULARIZATIONS_COLLECTION, r.id, r);
        return list
          .filter((r) => (r.employeeId || '').toUpperCase() === cleanId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.queryDocs<AttendanceRegularizationRequest>(
      REGULARIZATIONS_COLLECTION,
      (r) => (r.employeeId || '').toUpperCase() === cleanId
    );
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getAll(): Promise<AttendanceRegularizationRequest[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(REGULARIZATIONS_COLLECTION).get();
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AttendanceRegularizationRequest));
        for (const r of list) storageEngine.setDoc(REGULARIZATIONS_COLLECTION, r.id, r);
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.getAllDocs<AttendanceRegularizationRequest>(REGULARIZATIONS_COLLECTION);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getPending(): Promise<AttendanceRegularizationRequest[]> {
    const all = await this.getAll();
    return all.filter((r) => r.status === 'PENDING');
  },

  async create(req: AttendanceRegularizationRequest): Promise<AttendanceRegularizationRequest> {
    storageEngine.setDoc(REGULARIZATIONS_COLLECTION, req.id, req);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(REGULARIZATIONS_COLLECTION).doc(req.id).set(req);
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return req;
  },

  async update(id: string, updates: Partial<AttendanceRegularizationRequest>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageEngine.updateDoc(REGULARIZATIONS_COLLECTION, id, payload);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(REGULARIZATIONS_COLLECTION).doc(id).set(payload, { merge: true });
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },
};
