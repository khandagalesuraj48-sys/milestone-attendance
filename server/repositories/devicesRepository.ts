import { adminDb } from '../firebaseAdmin';
import { DeviceBinding } from '../../src/types';

const COLLECTION = 'devices';

export const devicesRepository = {
  async getById(deviceId: string): Promise<DeviceBinding | null> {
    const doc = await adminDb.collection(COLLECTION).doc(deviceId).get();
    if (!doc.exists) return null;
    return { ...doc.data(), deviceId: doc.id, id: doc.id } as DeviceBinding;
  },

  async getByEmployeeId(employeeId: string): Promise<DeviceBinding[]> {
    const clean = employeeId.trim().toUpperCase();
    const snap = await adminDb
      .collection(COLLECTION)
      .where('employeeId', '==', clean)
      .get();
    return snap.docs.map((doc) => ({ ...doc.data(), deviceId: doc.id, id: doc.id } as DeviceBinding));
  },

  async getActiveByEmployeeId(employeeId: string): Promise<DeviceBinding | null> {
    const clean = employeeId.trim().toUpperCase();
    const snap = await adminDb
      .collection(COLLECTION)
      .where('employeeId', '==', clean)
      .where('status', '==', 'APPROVED')
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { ...doc.data(), deviceId: doc.id, id: doc.id } as DeviceBinding;
  },

  async getByInstallationKey(installationKey: string): Promise<DeviceBinding | null> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where('deviceSignature', '==', installationKey)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { ...doc.data(), deviceId: doc.id, id: doc.id } as DeviceBinding;
  },

  async create(device: DeviceBinding): Promise<DeviceBinding> {
    const docId = device.deviceId || device.id || `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const docData: DeviceBinding = {
      ...device,
      deviceId: docId,
      id: docId,
      createdAt: device.createdAt || new Date().toISOString(),
      updatedAt: device.updatedAt || new Date().toISOString(),
    };
    await adminDb.collection(COLLECTION).doc(docId).set(docData);
    return docData;
  },

  async update(deviceId: string, updates: Partial<DeviceBinding>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await adminDb.collection(COLLECTION).doc(deviceId).set(payload, { merge: true });
  },

  async revokeAllForEmployee(employeeId: string, adminId: string, reason: string): Promise<void> {
    const clean = employeeId.trim().toUpperCase();
    const snap = await adminDb.collection(COLLECTION).where('employeeId', '==', clean).get();
    const batch = adminDb.batch();
    snap.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'REVOKED',
        revokedAt: new Date().toISOString(),
        revokedByAdminId: adminId,
        revocationReason: reason,
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
  },
};
