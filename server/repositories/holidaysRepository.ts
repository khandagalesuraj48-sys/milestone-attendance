import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { Holiday } from '../../src/types';

const HOLIDAYS_COLLECTION = 'holidays';

export const holidaysRepository = {
  async getAll(): Promise<Holiday[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(HOLIDAYS_COLLECTION).get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Holiday));
        for (const h of list) storageEngine.setDoc(HOLIDAYS_COLLECTION, h.id, h);
        return list.sort((a, b) => a.date.localeCompare(b.date));
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.getAllDocs<Holiday>(HOLIDAYS_COLLECTION);
    return list.sort((a, b) => a.date.localeCompare(b.date));
  },

  async getById(id: string): Promise<Holiday | null> {
    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(HOLIDAYS_COLLECTION).doc(id).get();
        if (doc.exists) {
          const h = { ...doc.data(), id: doc.id } as Holiday;
          storageEngine.setDoc(HOLIDAYS_COLLECTION, id, h);
          return h;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const local = storageEngine.getDoc<Holiday>(HOLIDAYS_COLLECTION, id);
    if (local) return local;

    const all = storageEngine.getAllDocs<Holiday>(HOLIDAYS_COLLECTION);
    return all.find((h) => h.id === id) || null;
  },

  async getByDate(dateStr: string): Promise<Holiday | null> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(HOLIDAYS_COLLECTION).where('date', '==', dateStr).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = doc.data() as Holiday;
          const h = { ...data, id: doc.id };
          storageEngine.setDoc(HOLIDAYS_COLLECTION, h.id, h);
          if (h.isActive === false) return null;
          return h;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const h = storageEngine.findDoc<Holiday>(
      HOLIDAYS_COLLECTION,
      (item) => item.date === dateStr && item.isActive !== false
    );
    return h || null;
  },

  async create(holiday: Holiday): Promise<Holiday> {
    storageEngine.setDoc(HOLIDAYS_COLLECTION, holiday.id, holiday);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(HOLIDAYS_COLLECTION).doc(holiday.id).set(holiday);
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return holiday;
  },

  async update(id: string, updates: Partial<Holiday>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageEngine.updateDoc(HOLIDAYS_COLLECTION, id, payload);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(HOLIDAYS_COLLECTION).doc(id).set(payload, { merge: true });
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },

  async delete(id: string): Promise<void> {
    storageEngine.deleteDoc(HOLIDAYS_COLLECTION, id);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(HOLIDAYS_COLLECTION).doc(id).delete();
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },

  /**
   * Helper to check if a specific date is a company holiday
   */
  async isHoliday(dateStr: string): Promise<boolean> {
    const holiday = await this.getByDate(dateStr);
    return !!holiday && holiday.isActive !== false;
  },

  /**
   * Filter out holidays from a date range (for calculating eligible leave days)
   */
  async getHolidaysInRange(startDate: string, endDate: string): Promise<Holiday[]> {
    const all = await this.getAll();
    return all.filter(
      (h) => h.isActive !== false && h.date >= startDate && h.date <= endDate
    );
  },
};
