import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { MasterRegisterSummary, MasterRegisterEntry, MasterRegisterStatus } from '../../src/types';

const SUMMARIES_COLLECTION = 'master_register_summaries';
const ENTRIES_COLLECTION = 'master_register_entries';

export const masterRegisterRepository = {
  async getByMonth(month: string): Promise<MasterRegisterSummary | null> {
    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(SUMMARIES_COLLECTION).doc(month).get();
        if (doc.exists) {
          const summary = { ...doc.data(), month: doc.id } as MasterRegisterSummary;
          const entriesSnap = await adminDb.collection(ENTRIES_COLLECTION).where('month', '==', month).get();
          summary.entries = entriesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as MasterRegisterEntry));
          storageEngine.setDoc(SUMMARIES_COLLECTION, month, summary);
          for (const entry of summary.entries) storageEngine.setDoc(ENTRIES_COLLECTION, entry.id, entry);
          return summary;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const summary = storageEngine.getDoc<MasterRegisterSummary>(SUMMARIES_COLLECTION, month);
    if (!summary) return null;
    summary.entries = storageEngine.queryDocs<MasterRegisterEntry>(ENTRIES_COLLECTION, (e) => e.month === month);
    return summary;
  },

  async getAllSummaries(): Promise<MasterRegisterSummary[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(SUMMARIES_COLLECTION).orderBy('month', 'desc').get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), month: doc.id } as MasterRegisterSummary));
        for (const s of list) storageEngine.setDoc(SUMMARIES_COLLECTION, s.month, s);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.getAllDocs<MasterRegisterSummary>(SUMMARIES_COLLECTION);
    return list.sort((a, b) => b.month.localeCompare(a.month));
  },

  async saveSummary(summary: MasterRegisterSummary): Promise<MasterRegisterSummary> {
    const { entries, ...summaryData } = summary;

    storageEngine.setDoc(SUMMARIES_COLLECTION, summary.month, {
      ...summaryData,
      updatedAt: new Date().toISOString(),
    });

    for (const entry of entries) {
      storageEngine.setDoc(ENTRIES_COLLECTION, entry.id, {
        ...entry,
        updatedAt: new Date().toISOString(),
      });
    }

    if (isRemoteFirestoreActive()) {
      try {
        const batch = adminDb.batch();
        const summaryRef = adminDb.collection(SUMMARIES_COLLECTION).doc(summary.month);

        batch.set(summaryRef, {
          ...summaryData,
          updatedAt: new Date().toISOString(),
        });

        for (const entry of entries) {
          const entryRef = adminDb.collection(ENTRIES_COLLECTION).doc(entry.id);
          batch.set(entryRef, {
            ...entry,
            updatedAt: new Date().toISOString(),
          });
        }

        await batch.commit();
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return summary;
  },

  async updateEntry(month: string, entryId: string, updates: Partial<MasterRegisterEntry>): Promise<MasterRegisterEntry | null> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageEngine.updateDoc(ENTRIES_COLLECTION, entryId, payload);

    if (isRemoteFirestoreActive()) {
      try {
        const entryRef = adminDb.collection(ENTRIES_COLLECTION).doc(entryId);
        await entryRef.set(payload, { merge: true });
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    // Recalculate summary totals
    const entries = storageEngine.queryDocs<MasterRegisterEntry>(ENTRIES_COLLECTION, (e) => e.month === month);
    const totalPayableDays = entries.reduce((sum, e) => sum + (e.id === entryId ? (updates.totalPayableDays ?? e.totalPayableDays) : e.totalPayableDays), 0);

    storageEngine.updateDoc(SUMMARIES_COLLECTION, month, {
      totalPayableDays,
      updatedAt: new Date().toISOString(),
    });

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(SUMMARIES_COLLECTION).doc(month).set(
          {
            totalPayableDays,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.getDoc<MasterRegisterEntry>(ENTRIES_COLLECTION, entryId);
  },

  async updateStatus(
    month: string,
    status: MasterRegisterStatus,
    adminId: string,
    adminName: string
  ): Promise<MasterRegisterSummary | null> {
    const nowIso = new Date().toISOString();
    const updates: Partial<MasterRegisterSummary> = {
      status,
      updatedAt: nowIso,
    };

    if (status === 'SUBMITTED') {
      updates.submittedAt = nowIso;
      updates.submittedBy = adminName;
    } else if (status === 'FINALIZED') {
      updates.finalizedAt = nowIso;
      updates.finalizedBy = adminName;
    } else if (status === 'REOPENED') {
      updates.reopenedAt = nowIso;
      updates.reopenedBy = adminName;
    }

    storageEngine.updateDoc(SUMMARIES_COLLECTION, month, updates);

    const entries = storageEngine.queryDocs<MasterRegisterEntry>(ENTRIES_COLLECTION, (e) => e.month === month);
    for (const e of entries) {
      storageEngine.updateDoc(ENTRIES_COLLECTION, e.id, {
        status,
        updatedAt: nowIso,
      });
    }

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(SUMMARIES_COLLECTION).doc(month).set(updates, { merge: true });

        const entriesSnap = await adminDb.collection(ENTRIES_COLLECTION).where('month', '==', month).get();
        const batch = adminDb.batch();
        for (const doc of entriesSnap.docs) {
          batch.update(doc.ref, {
            status,
            updatedAt: nowIso,
          });
        }
        await batch.commit();
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return this.getByMonth(month);
  },
};
