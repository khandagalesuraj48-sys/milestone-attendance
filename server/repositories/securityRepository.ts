import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
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

    storageEngine.setDoc(COLLECTION, docId, docData);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(COLLECTION).doc(docId).set(docData);
      } catch (e: any) {
        if (isFirestorePermissionOrNetworkError(e)) {
          markFirestoreUnavailable(e);
        }
      }
    }
    return docData;
  },

  async getAll(limitCount: number = 100): Promise<SecurityEvent[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .orderBy('timestamp', 'desc')
          .limit(limitCount)
          .get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as SecurityEvent));
        for (const s of list) storageEngine.setDoc(COLLECTION, s.id, s);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const all = storageEngine.getAllDocs<SecurityEvent>(COLLECTION);
    return all
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitCount);
  },

  async getRecent(limitCount: number = 10): Promise<SecurityEvent[]> {
    return this.getAll(limitCount);
  },
};
