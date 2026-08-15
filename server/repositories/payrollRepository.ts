import { adminDb } from '../firebaseAdmin';
import { PayrollRun, PayrollItem, SalarySlip } from '../../src/types';

const RUNS_COLLECTION = 'payroll_runs';
const ITEMS_COLLECTION = 'payroll_items';

export const payrollRepository = {
  async getAllRuns(): Promise<PayrollRun[]> {
    const snap = await adminDb.collection(RUNS_COLLECTION).orderBy('month', 'desc').get();
    return snap.docs.map((doc) => ({ ...doc.data(), id: doc.id } as PayrollRun));
  },

  async getRunById(id: string): Promise<PayrollRun | null> {
    const doc = await adminDb.collection(RUNS_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    const run = { ...doc.data(), id: doc.id } as PayrollRun;

    const itemsSnap = await adminDb.collection(ITEMS_COLLECTION).where('payrollRunId', '==', id).get();
    run.items = itemsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as PayrollItem));
    return run;
  },

  async getRunByMonth(month: string): Promise<PayrollRun | null> {
    const snap = await adminDb.collection(RUNS_COLLECTION).where('month', '==', month).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const run = { ...doc.data(), id: doc.id } as PayrollRun;
    const itemsSnap = await adminDb.collection(ITEMS_COLLECTION).where('payrollRunId', '==', run.id).get();
    run.items = itemsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as PayrollItem));
    return run;
  },

  async saveRun(run: PayrollRun, items: PayrollItem[]): Promise<PayrollRun> {
    const batch = adminDb.batch();
    const runRef = adminDb.collection(RUNS_COLLECTION).doc(run.id);

    const { items: _, ...runData } = run;
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
    return { ...run, items };
  },

  async updateRun(id: string, updates: Partial<PayrollRun>): Promise<void> {
    await adminDb.collection(RUNS_COLLECTION).doc(id).set(
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  async updateItem(runId: string, itemId: string, updates: Partial<PayrollItem>): Promise<PayrollItem | null> {
    const itemRef = adminDb.collection(ITEMS_COLLECTION).doc(itemId);
    const doc = await itemRef.get();
    if (!doc.exists) return null;

    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await itemRef.set(payload, { merge: true });

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

    const updatedDoc = await itemRef.get();
    return { ...updatedDoc.data(), id: updatedDoc.id } as PayrollItem;
  },

  async deleteRun(id: string): Promise<void> {
    const itemsSnap = await adminDb.collection(ITEMS_COLLECTION).where('payrollRunId', '==', id).get();
    const batch = adminDb.batch();
    for (const doc of itemsSnap.docs) {
      batch.delete(doc.ref);
    }
    batch.delete(adminDb.collection(RUNS_COLLECTION).doc(id));
    await batch.commit();
  },

  async getPublishedSlipsForEmployee(employeeId: string): Promise<PayrollItem[]> {
    const cleanEmpId = employeeId.trim().toUpperCase();
    const snap = await adminDb
      .collection(ITEMS_COLLECTION)
      .where('employeeId', '==', cleanEmpId)
      .where('paymentStatus', 'in', ['PAID', 'UNPAID'])
      .get();

    // Filter to only those whose parent run is published
    const runsSnap = await adminDb.collection(RUNS_COLLECTION).where('status', '==', 'PUBLISHED').get();
    const publishedRunIds = new Set(runsSnap.docs.map((d) => d.id));

    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as PayrollItem))
      .filter((item) => publishedRunIds.has(item.payrollRunId))
      .sort((a, b) => b.month.localeCompare(a.month));
  },

  async getSlipById(itemId: string): Promise<SalarySlip | null> {
    const doc = await adminDb.collection(ITEMS_COLLECTION).doc(itemId).get();
    if (!doc.exists) return null;
    const item = { ...doc.data(), id: doc.id } as PayrollItem;

    const runDoc = await adminDb.collection(RUNS_COLLECTION).doc(item.payrollRunId).get();
    if (!runDoc.exists) return null;
    const run = runDoc.data() as PayrollRun;

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
