import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { AppNotification } from '../../src/types';

const NOTIFICATIONS_COLLECTION = 'notifications';

export const notificationsRepository = {
  async getByEmployeeId(employeeId: string): Promise<AppNotification[]> {
    const cleanId = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(NOTIFICATIONS_COLLECTION).get();
        const all = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AppNotification));
        for (const n of all) storageEngine.setDoc(NOTIFICATIONS_COLLECTION, n.id, n);
        const filtered = all.filter(
          (n) => (n.employeeId || '').toUpperCase() === cleanId || n.employeeId === 'ALL'
        );
        return filtered.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const all = storageEngine.getAllDocs<AppNotification>(NOTIFICATIONS_COLLECTION);
    const filtered = all.filter(
      (n) => (n.employeeId || '').toUpperCase() === cleanId || n.employeeId === 'ALL'
    );
    return filtered.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  },

  async create(notification: AppNotification): Promise<AppNotification> {
    storageEngine.setDoc(NOTIFICATIONS_COLLECTION, notification.id, notification);

    if (isRemoteFirestoreActive()) {
      try {
        const docRef = adminDb.collection(NOTIFICATIONS_COLLECTION).doc(notification.id);
        await docRef.set(notification);
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return notification;
  },

  async markAsRead(id: string, employeeId?: string): Promise<void> {
    storageEngine.updateDoc(NOTIFICATIONS_COLLECTION, id, { read: true, updatedAt: new Date().toISOString() });

    if (isRemoteFirestoreActive()) {
      try {
        const docRef = adminDb.collection(NOTIFICATIONS_COLLECTION).doc(id);
        const snap = await docRef.get();
        if (snap.exists) {
          await docRef.update({ read: true, updatedAt: new Date().toISOString() });
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },

  async markAllAsRead(employeeId: string): Promise<number> {
    const list = await this.getByEmployeeId(employeeId);
    let count = 0;

    for (const item of list) {
      if (!item.read) {
        count++;
        this.markAsRead(item.id, employeeId);
      }
    }

    return count;
  },
};
