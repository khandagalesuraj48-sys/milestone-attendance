import { adminDb } from '../firebaseAdmin';
import { MasterRegisterSummary, MasterRegisterEntry, MasterRegisterStatus } from '../../src/types';

const SUMMARIES_COLLECTION = 'master_register_summaries';
const ENTRIES_COLLECTION = 'master_register_entries';

export const masterRegisterRepository = {
  async getByMonth(month: string): Promise<MasterRegisterSummary | null> {
    const doc = await adminDb.collection(SUMMARIES_COLLECTION).doc(month).get();
    if (!doc.exists) return null;

    const summary = { ...doc.data(), month: doc.id } as MasterRegisterSummary;
    const entriesSnap = await adminDb.collection(ENTRIES_COLLECTION).where('month', '==', month).get();
    summary.entries = entriesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as MasterRegisterEntry));
    return summary;
  },

  async getAllSummaries(): Promise<MasterRegisterSummary[]> {
    const snap = await adminDb.collection(SUMMARIES_COLLECTION).orderBy('month', 'desc').get();
    return snap.docs.map((doc) => ({ ...doc.data(), month: doc.id } as MasterRegisterSummary));
  },

  async saveSummary(summary: MasterRegisterSummary): Promise<MasterRegisterSummary> {
    const batch = adminDb.batch();
    const summaryRef = adminDb.collection(SUMMARIES_COLLECTION).doc(summary.month);

    const { entries, ...summaryData } = summary;
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
    return summary;
  },

  async updateEntry(month: string, entryId: string, updates: Partial<MasterRegisterEntry>): Promise<MasterRegisterEntry | null> {
    const entryRef = adminDb.collection(ENTRIES_COLLECTION).doc(entryId);
    const doc = await entryRef.get();
    if (!doc.exists) return null;

    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await entryRef.set(payload, { merge: true });

    // Recalculate summary totals
    const entriesSnap = await adminDb.collection(ENTRIES_COLLECTION).where('month', '==', month).get();
    const entries = entriesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as MasterRegisterEntry));
    const totalPayableDays = entries.reduce((sum, e) => sum + (e.id === entryId ? (updates.totalPayableDays ?? e.totalPayableDays) : e.totalPayableDays), 0);

    await adminDb.collection(SUMMARIES_COLLECTION).doc(month).set(
      {
        totalPayableDays,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const updatedDoc = await entryRef.get();
    return { ...updatedDoc.data(), id: updatedDoc.id } as MasterRegisterEntry;
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

    await adminDb.collection(SUMMARIES_COLLECTION).doc(month).set(updates, { merge: true });

    // Update status on all entries as well
    const entriesSnap = await adminDb.collection(ENTRIES_COLLECTION).where('month', '==', month).get();
    const batch = adminDb.batch();
    for (const doc of entriesSnap.docs) {
      batch.update(doc.ref, {
        status,
        updatedAt: nowIso,
      });
    }
    await batch.commit();

    return this.getByMonth(month);
  },
};
