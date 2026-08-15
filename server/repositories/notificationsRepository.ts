import { adminDb } from '../firebaseAdmin';
import { AppNotification } from '../../src/types';

const NOTIFICATIONS_COLLECTION = 'notifications';

export const notificationsRepository = {
  async getByEmployeeId(employeeId: string): Promise<AppNotification[]> {
    const snap = await adminDb.collection(NOTIFICATIONS_COLLECTION).get();
    const all = snap.docs.map((d) => ({ ...d.data(), id: d.id } as AppNotification));

    // Include notifications targeted specifically to employee, or broadcast to ALL or ADMIN
    const filtered = all.filter(
      (n) => n.employeeId === employeeId || n.employeeId === 'ALL'
    );

    // Sort newest first
    return filtered.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  },

  async create(notification: AppNotification): Promise<AppNotification> {
    const docRef = adminDb.collection(NOTIFICATIONS_COLLECTION).doc(notification.id);
    await docRef.set(notification);
    return notification;
  },

  async markAsRead(id: string, employeeId?: string): Promise<void> {
    const docRef = adminDb.collection(NOTIFICATIONS_COLLECTION).doc(id);
    const snap = await docRef.get();
    if (snap.exists) {
      await docRef.update({ read: true, updatedAt: new Date().toISOString() });
    }
  },

  async markAllAsRead(employeeId: string): Promise<number> {
    const list = await this.getByEmployeeId(employeeId);
    let count = 0;
    const batch = adminDb.batch();

    for (const item of list) {
      if (!item.read) {
        const ref = adminDb.collection(NOTIFICATIONS_COLLECTION).doc(item.id);
        batch.update(ref, { read: true, updatedAt: new Date().toISOString() });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    return count;
  },
};
