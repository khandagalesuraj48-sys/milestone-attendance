import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { AuditLog } from '../../src/types';

const COLLECTION = 'auditLogs';

export const auditRepository = {
  async log(entry: Omit<AuditLog, 'id' | 'timestamp'> & { timestamp?: string }): Promise<AuditLog> {
    const docId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const docData: AuditLog = {
      id: docId,
      timestamp: entry.timestamp || new Date().toISOString(),
      actorId: entry.actorId,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      action: entry.action,
      targetId: entry.targetId,
      details: entry.details,
      ipAddress: entry.ipAddress || '127.0.0.1',
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

  async getRecent(limitCount: number = 100): Promise<AuditLog[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .orderBy('timestamp', 'desc')
          .limit(limitCount)
          .get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as AuditLog));
        for (const l of list) storageEngine.setDoc(COLLECTION, l.id, l);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const all = storageEngine.getAllDocs<AuditLog>(COLLECTION);
    return all
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitCount);
  },

  async getByTargetId(targetId: string, limitCount: number = 50): Promise<AuditLog[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .where('targetId', '==', targetId)
          .orderBy('timestamp', 'desc')
          .limit(limitCount)
          .get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as AuditLog));
        for (const l of list) storageEngine.setDoc(COLLECTION, l.id, l);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.queryDocs<AuditLog>(COLLECTION, (l) => l.targetId === targetId);
    return list
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitCount);
  },
};
