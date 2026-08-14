import { adminDb } from '../firebaseAdmin';
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
    try {
      await adminDb.collection(COLLECTION).doc(docId).set(docData);
    } catch (e) {
      console.error('Failed to persist audit log:', e);
    }
    return docData;
  },

  async getRecent(limitCount: number = 100): Promise<AuditLog[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(limitCount)
      .get();
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as AuditLog));
  },

  async getByTargetId(targetId: string, limitCount: number = 50): Promise<AuditLog[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where('targetId', '==', targetId)
      .orderBy('timestamp', 'desc')
      .limit(limitCount)
      .get();
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as AuditLog));
  },
};
