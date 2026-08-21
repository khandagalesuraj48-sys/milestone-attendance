import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { PayrollRun, PayrollItem, SalarySlip } from '../../src/types';

const RUNS_COLLECTION = 'payroll_runs';
const ITEMS_COLLECTION = 'payroll_items';

export const payrollRepository = {
  async getAllRuns(): Promise<PayrollRun[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(RUNS_COLLECTION).orderBy('month', 'desc').get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as PayrollRun));
        for (const r of list) storageEngine.setDoc(RUNS_COLLECTION, r.id, r);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.getAllDocs<PayrollRun>(RUNS_COLLECTION);
    return list.sort((a, b) => b.month.localeCompare(a.month));
  },

  async getRunById(id: string): Promise<PayrollRun | null> {
    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(RUNS_COLLECTION).doc(id).get();
        if (doc.exists) {
          const run = { ...doc.data(), id: doc.id } as PayrollRun;
          const itemsSnap = await adminDb.collection(ITEMS_COLLECTION).where('payrollRunId', '==', id).get();
          run.items = itemsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as PayrollItem));
          storageEngine.setDoc(RUNS_COLLECTION, id, run);
          for (const it of run.items) storageEngine.setDoc(ITEMS_COLLECTION, it.id, it);
          return run;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const run = storageEngine.getDoc<PayrollRun>(RUNS_COLLECTION, id);
    if (!run) return null;
    run.items = storageEngine.queryDocs<PayrollItem>(ITEMS_COLLECTION, (it) => it.payrollRunId === id);
    return run;
  },

  async getRunByMonth(month: string): Promise<PayrollRun | null> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(RUNS_COLLECTION).where('month', '==', month).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const run = { ...doc.data(), id: doc.id } as PayrollRun;
          const itemsSnap = await adminDb.collection(ITEMS_COLLECTION).where('payrollRunId', '==', run.id).get();
          run.items = itemsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as PayrollItem));
          storageEngine.setDoc(RUNS_COLLECTION, run.id, run);
          for (const it of run.items) storageEngine.setDoc(ITEMS_COLLECTION, it.id, it);
          return run;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const run = storageEngine.findDoc<PayrollRun>(RUNS_COLLECTION, (r) => r.month === month);
    if (!run) return null;
    run.items = storageEngine.queryDocs<PayrollItem>(ITEMS_COLLECTION, (it) => it.payrollRunId === run.id);
    return run;
  },

  async saveRun(run: PayrollRun, items: PayrollItem[]): Promise<PayrollRun> {
    const { items: _, ...runData } = run;
    storageEngine.setDoc(RUNS_COLLECTION, run.id, {
      ...runData,
      updatedAt: new Date().toISOString(),
    });

    for (const item of items) {
      storageEngine.setDoc(ITEMS_COLLECTION, item.id, {
        ...item,
        updatedAt: new Date().toISOString(),
      });
    }

    if (isRemoteFirestoreActive()) {
      try {
        const batch = adminDb.batch();
        const runRef = adminDb.collection(RUNS_COLLECTION).doc(run.id);

        batch.set(runRef, {
          ...runData,
          updatedAt: new Date().toISOString(),
        });

        for (const item of items) {
          const itemRef = adminDb.collection(ITEMS_COLLECTION).doc(item.id);
          batch.set(itemRef, {
            ...item,
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

    return { ...run, items };
  },

  async updateRun(id: string, updates: Partial<PayrollRun>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageEngine.updateDoc(RUNS_COLLECTION, id, payload);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(RUNS_COLLECTION).doc(id).set(payload, { merge: true });
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },

  async updateItem(runId: string, itemId: string, updates: Partial<PayrollItem>): Promise<PayrollItem | null> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageEngine.updateDoc(ITEMS_COLLECTION, itemId, payload);

    if (isRemoteFirestoreActive()) {
      try {
        const itemRef = adminDb.collection(ITEMS_COLLECTION).doc(itemId);
        await itemRef.set(payload, { merge: true });
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    // Recalculate run totals
    const run = await this.getRunById(runId);
    if (run && run.items) {
      const totalGrossAmount = run.items.reduce((sum, it) => sum + (it.id === itemId ? (updates.totalGrossEarned ?? it.totalGrossEarned) : it.totalGrossEarned), 0);
      const totalDeductionsAmount = run.items.reduce((sum, it) => sum + (it.id === itemId ? (updates.totalDeductions ?? it.totalDeductions) : it.totalDeductions), 0);
      const totalNetAmount = run.items.reduce((sum, it) => sum + (it.id === itemId ? (updates.netSalary ?? it.netSalary) : it.netSalary), 0);

      await this.updateRun(runId, {
        totalGrossAmount,
        totalDeductionsAmount,
        totalNetAmount,
      });
    }

    return storageEngine.getDoc<PayrollItem>(ITEMS_COLLECTION, itemId);
  },

  async deleteRun(id: string): Promise<void> {
    const items = storageEngine.queryDocs<PayrollItem>(ITEMS_COLLECTION, (it) => it.payrollRunId === id);
    for (const it of items) storageEngine.deleteDoc(ITEMS_COLLECTION, it.id);
    storageEngine.deleteDoc(RUNS_COLLECTION, id);

    if (isRemoteFirestoreActive()) {
      try {
        const itemsSnap = await adminDb.collection(ITEMS_COLLECTION).where('payrollRunId', '==', id).get();
        const batch = adminDb.batch();
        for (const doc of itemsSnap.docs) {
          batch.delete(doc.ref);
        }
        batch.delete(adminDb.collection(RUNS_COLLECTION).doc(id));
        await batch.commit();
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },

  async getPublishedSlipsForEmployee(employeeId: string): Promise<PayrollItem[]> {
    const cleanEmpId = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(ITEMS_COLLECTION)
          .where('employeeId', '==', cleanEmpId)
          .where('paymentStatus', 'in', ['PAID', 'UNPAID'])
          .get();

        const runsSnap = await adminDb.collection(RUNS_COLLECTION).where('status', '==', 'PUBLISHED').get();
        const publishedRunIds = new Set(runsSnap.docs.map((d) => d.id));

        return snap.docs
          .map((d) => ({ ...d.data(), id: d.id } as PayrollItem))
          .filter((item) => publishedRunIds.has(item.payrollRunId))
          .sort((a, b) => b.month.localeCompare(a.month));
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const publishedRuns = storageEngine.queryDocs<PayrollRun>(RUNS_COLLECTION, (r) => r.status === 'PUBLISHED');
    const publishedRunIds = new Set(publishedRuns.map((r) => r.id));

    const items = storageEngine.queryDocs<PayrollItem>(
      ITEMS_COLLECTION,
      (it) => (it.employeeId || '').toUpperCase() === cleanEmpId && publishedRunIds.has(it.payrollRunId)
    );
    return items.sort((a, b) => b.month.localeCompare(a.month));
  },

  async getSlipById(itemId: string): Promise<SalarySlip | null> {
    const item = storageEngine.getDoc<PayrollItem>(ITEMS_COLLECTION, itemId);
    if (!item) return null;

    const run = storageEngine.getDoc<PayrollRun>(RUNS_COLLECTION, item.payrollRunId);
    if (!run) return null;

    const slip: SalarySlip = {
      ...item,
      companyName: 'Milestone Consultancy',
      companyAddress: 'Unit 402, Signature Tower, S.B. Road, Pune, Maharashtra 411016',
      companyLogoUrl: '/assets/branding/milestone-logo.svg',
      slipNumber: `MC/PAY/${item.month.replace('-', '')}/${item.employeeId}`,
    };
    return slip;
  },
};
