import { adminDb } from '../firebaseAdmin';
import { Holiday } from '../../src/types';

const HOLIDAYS_COLLECTION = 'holidays';

export const holidaysRepository = {
  async getAll(): Promise<Holiday[]> {
    const snap = await adminDb.collection(HOLIDAYS_COLLECTION).get();
    const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Holiday));
    return list.sort((a, b) => a.date.localeCompare(b.date));
  },

  async getById(id: string): Promise<Holiday | null> {
    const doc = await adminDb.collection(HOLIDAYS_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { ...doc.data(), id: doc.id } as Holiday;
  },

  async getByDate(dateStr: string): Promise<Holiday | null> {
    const snap = await adminDb.collection(HOLIDAYS_COLLECTION).where('date', '==', dateStr).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data() as Holiday;
    if (data.isActive === false) return null;
    return { ...data, id: doc.id };
  },

  async create(holiday: Holiday): Promise<Holiday> {
    await adminDb.collection(HOLIDAYS_COLLECTION).doc(holiday.id).set(holiday);
    return holiday;
  },

  async update(id: string, updates: Partial<Holiday>): Promise<void> {
    await adminDb.collection(HOLIDAYS_COLLECTION).doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async delete(id: string): Promise<void> {
    await adminDb.collection(HOLIDAYS_COLLECTION).doc(id).delete();
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
