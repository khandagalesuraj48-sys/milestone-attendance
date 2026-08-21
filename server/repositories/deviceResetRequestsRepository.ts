import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { DeviceResetRequest, DeviceResetRequestStatus } from '../../src/types';

const COLLECTION = 'deviceResetRequests';

export const deviceResetRequestsRepository = {
  async getById(id: string): Promise<DeviceResetRequest | null> {
    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(COLLECTION).doc(id).get();
        if (doc.exists) {
          const req = { ...doc.data(), id: doc.id, requestId: doc.id } as DeviceResetRequest;
          storageEngine.setDoc(COLLECTION, id, req);
          return req;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const local = storageEngine.getDoc<DeviceResetRequest>(COLLECTION, id);
    if (local) return local;

    const all = storageEngine.getAllDocs<DeviceResetRequest>(COLLECTION);
    return all.find((r) => r.id === id || r.requestId === id) || null;
  },

  async getAll(): Promise<DeviceResetRequest[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .orderBy('createdAt', 'desc')
          .get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id, requestId: doc.id } as DeviceResetRequest));
        for (const r of list) storageEngine.setDoc(COLLECTION, r.id, r);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.getAllDocs<DeviceResetRequest>(COLLECTION);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getPending(): Promise<DeviceResetRequest[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .where('status', '==', 'PENDING')
          .get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id, requestId: doc.id } as DeviceResetRequest));
        for (const r of list) storageEngine.setDoc(COLLECTION, r.id, r);
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.queryDocs<DeviceResetRequest>(COLLECTION, (r) => r.status === 'PENDING');
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getByEmployeeId(employeeId: string): Promise<DeviceResetRequest[]> {
    const clean = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .where('employeeId', '==', clean)
          .get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id, requestId: doc.id } as DeviceResetRequest));
        for (const r of list) storageEngine.setDoc(COLLECTION, r.id, r);
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.queryDocs<DeviceResetRequest>(
      COLLECTION,
      (r) => (r.employeeId || '').toUpperCase() === clean
    );
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getPendingByEmployeeId(employeeId: string): Promise<DeviceResetRequest | null> {
    const clean = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .where('employeeId', '==', clean)
          .where('status', '==', 'PENDING')
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const req = { ...doc.data(), id: doc.id, requestId: doc.id } as DeviceResetRequest;
          storageEngine.setDoc(COLLECTION, req.id, req);
          return req;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const req = storageEngine.findDoc<DeviceResetRequest>(
      COLLECTION,
      (r) => (r.employeeId || '').toUpperCase() === clean && r.status === 'PENDING'
    );
    return req || null;
  },

  async create(request: Partial<DeviceResetRequest> & { employeeId: string; employeeName: string; reason: string }): Promise<DeviceResetRequest> {
    const docId = request.id || `dev_rst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const docData: DeviceResetRequest = {
      id: docId,
      requestId: docId,
      employeeId: request.employeeId.trim().toUpperCase(),
      employeeName: request.employeeName,
      department: request.department || '',
      designation: request.designation || '',
      reason: request.reason,
      currentDeviceId: request.currentDeviceId || null,
      currentHardwareSignature: request.currentHardwareSignature || null,
      status: 'PENDING',
      requestedAt: request.requestedAt || nowIso,
      reviewedByAdminId: null,
      reviewedByAdminName: null,
      reviewedAt: null,
      reviewNotes: null,
      createdAt: nowIso,
      updatedAt: nowIso,
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

  async update(id: string, updates: Partial<DeviceResetRequest>): Promise<void> {
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
