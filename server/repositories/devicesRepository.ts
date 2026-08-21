import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { DeviceBinding } from '../../src/types';

const COLLECTION = 'devices';

export const devicesRepository = {
  async getById(deviceId: string): Promise<DeviceBinding | null> {
    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(COLLECTION).doc(deviceId).get();
        if (doc.exists) {
          const dev = { ...doc.data(), deviceId: doc.id, id: doc.id } as DeviceBinding;
          storageEngine.setDoc(COLLECTION, deviceId, dev);
          return dev;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const local = storageEngine.getDoc<DeviceBinding>(COLLECTION, deviceId);
    if (local) return local;

    const all = storageEngine.getAllDocs<DeviceBinding>(COLLECTION);
    return all.find((d) => d.deviceId === deviceId || d.id === deviceId) || null;
  },

  async getByEmployeeId(employeeId: string): Promise<DeviceBinding[]> {
    const clean = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .where('employeeId', '==', clean)
          .get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), deviceId: doc.id, id: doc.id } as DeviceBinding));
        for (const d of list) storageEngine.setDoc(COLLECTION, d.deviceId, d);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.queryDocs<DeviceBinding>(
      COLLECTION,
      (d) => (d.employeeId || '').toUpperCase() === clean
    );
  },

  async getActiveByEmployeeId(employeeId: string): Promise<DeviceBinding | null> {
    const clean = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .where('employeeId', '==', clean)
          .where('status', '==', 'APPROVED')
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const dev = { ...doc.data(), deviceId: doc.id, id: doc.id } as DeviceBinding;
          storageEngine.setDoc(COLLECTION, dev.deviceId, dev);
          return dev;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const dev = storageEngine.findDoc<DeviceBinding>(
      COLLECTION,
      (d) => (d.employeeId || '').toUpperCase() === clean && d.status === 'APPROVED'
    );
    return dev || null;
  },

  async getByInstallationKey(installationKey: string): Promise<DeviceBinding | null> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .where('deviceSignature', '==', installationKey)
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const dev = { ...doc.data(), deviceId: doc.id, id: doc.id } as DeviceBinding;
          storageEngine.setDoc(COLLECTION, dev.deviceId, dev);
          return dev;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const dev = storageEngine.findDoc<DeviceBinding>(
      COLLECTION,
      (d) => d.deviceSignature === installationKey
    );
    return dev || null;
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

  async update(deviceId: string, updates: Partial<DeviceBinding>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageEngine.updateDoc(COLLECTION, deviceId, payload);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(COLLECTION).doc(deviceId).set(payload, { merge: true });
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },

  async revokeAllForEmployee(employeeId: string, adminId: string, reason: string): Promise<void> {
    const clean = employeeId.trim().toUpperCase();
    const devs = storageEngine.queryDocs<DeviceBinding>(COLLECTION, (d) => (d.employeeId || '').toUpperCase() === clean);
    for (const d of devs) {
      storageEngine.updateDoc(COLLECTION, d.deviceId, {
        status: 'REVOKED',
        revokedAt: new Date().toISOString(),
        revokedByAdminId: adminId,
        revocationReason: reason,
        updatedAt: new Date().toISOString(),
      });
    }

    if (isRemoteFirestoreActive()) {
      try {
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
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },
};
