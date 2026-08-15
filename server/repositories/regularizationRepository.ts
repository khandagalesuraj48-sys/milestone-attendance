import { adminDb } from '../firebaseAdmin';
import { AttendanceRegularizationRequest } from '../../src/types';

const REGULARIZATIONS_COLLECTION = 'regularization_requests';

export const regularizationRepository = {
  async getById(id: string): Promise<AttendanceRegularizationRequest | null> {
    const doc = await adminDb.collection(REGULARIZATIONS_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { ...doc.data(), id: doc.id } as AttendanceRegularizationRequest;
  },

  async getByEmployeeId(employeeId: string): Promise<AttendanceRegularizationRequest[]> {
    const snap = await adminDb.collection(REGULARIZATIONS_COLLECTION).get();
    const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AttendanceRegularizationRequest));
    return list
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getAll(): Promise<AttendanceRegularizationRequest[]> {
    const snap = await adminDb.collection(REGULARIZATIONS_COLLECTION).get();
    const list = snap.docs.map((d) => ({ ...d.data(), id: docId(d) } as AttendanceRegularizationRequest));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async create(req: AttendanceRegularizationRequest): Promise<AttendanceRegularizationRequest> {
    await adminDb.collection(REGULARIZATIONS_COLLECTION).doc(req.id).set(req);
    return req;
  },

  async update(id: string, updates: Partial<AttendanceRegularizationRequest>): Promise<void> {
    await adminDb.collection(REGULARIZATIONS_COLLECTION).doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },
};

function docId(doc: FirebaseFirestore.QueryDocumentSnapshot): string {
  return doc.id;
}
