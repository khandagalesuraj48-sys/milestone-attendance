import { adminDb } from '../firebaseAdmin';
import { LeaveRecord } from '../../src/types';

const COLLECTION = 'leaveRecords';

export const leavesRepository = {
  async getById(id: string): Promise<LeaveRecord | null> {
    const doc = await adminDb.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { ...doc.data(), id: doc.id } as LeaveRecord;
  },

  async getByEmployeeId(employeeId: string): Promise<LeaveRecord[]> {
    const clean = employeeId.trim().toUpperCase();
    const snap = await adminDb
      .collection(COLLECTION)
      .where('employeeId', '==', clean)
      .get();
    const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as LeaveRecord));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getAll(): Promise<LeaveRecord[]> {
    const snap = await adminDb.collection(COLLECTION).get();
    const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as LeaveRecord));
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
    await adminDb.collection(COLLECTION).doc(docId).set(docData);
    return docData;
  },

  async update(id: string, updates: Partial<LeaveRecord>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await adminDb.collection(COLLECTION).doc(id).set(payload, { merge: true });
  },
};
