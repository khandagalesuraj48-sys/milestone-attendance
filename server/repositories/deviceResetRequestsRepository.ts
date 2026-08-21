import { adminDb } from '../firebaseAdmin';
import { DeviceResetRequest, DeviceResetRequestStatus } from '../../src/types';

const COLLECTION = 'deviceResetRequests';

export const deviceResetRequestsRepository = {
  async getById(id: string): Promise<DeviceResetRequest | null> {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { ...doc.data(), id: doc.id, requestId: doc.id } as DeviceResetRequest;
  },

  async getAll(): Promise<DeviceResetRequest[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id, requestId: doc.id } as DeviceResetRequest));
  },

  async getPending(): Promise<DeviceResetRequest[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where('status', '==', 'PENDING')
      .get();
    const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id, requestId: doc.id } as DeviceResetRequest));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getByEmployeeId(employeeId: string): Promise<DeviceResetRequest[]> {
    const clean = employeeId.trim().toUpperCase();
    const snap = await adminDb
      .collection(COLLECTION)
      .where('employeeId', '==', clean)
      .get();
    const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id, requestId: doc.id } as DeviceResetRequest));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getPendingByEmployeeId(employeeId: string): Promise<DeviceResetRequest | null> {
    const clean = employeeId.trim().toUpperCase();
    const snap = await adminDb
      .collection(COLLECTION)
      .where('employeeId', '==', clean)
      .where('status', '==', 'PENDING')
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { ...doc.data(), id: doc.id, requestId: doc.id } as DeviceResetRequest;
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
    await adminDb.collection(COLLECTION).doc(docId).set(docData);
    return docData;
  },

  async update(id: string, updates: Partial<DeviceResetRequest>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await adminDb.collection(COLLECTION).doc(id).set(payload, { merge: true });
  },
};
