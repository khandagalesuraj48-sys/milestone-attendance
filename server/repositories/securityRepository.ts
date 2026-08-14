import { adminDb } from '../firebaseAdmin';
import { SecurityEvent } from '../../src/types';

const COLLECTION = 'securityEvents';

export const securityRepository = {
  async log(event: Omit<SecurityEvent, 'id' | 'timestamp'> & { timestamp?: string }): Promise<SecurityEvent> {
    const docId = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const docData: SecurityEvent = {
      id: docId,
      timestamp: event.timestamp || new Date().toISOString(),
      eventType: event.eventType,
      employeeId: event.employeeId,
      employeeName: event.employeeName,
      details: event.details,
      resolved: event.resolved ?? false,
    };
    try {
      await adminDb.collection(COLLECTION).doc(docId).set(docData);
    } catch (e) {
      console.error('Failed to persist security event:', e);
    }
    return docData;
  },

  async getAll(limitCount: number = 100): Promise<SecurityEvent[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(limitCount)
      .get();
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as SecurityEvent));
  },
};
