import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { LeaveBalance, LeaveLedgerEntry } from '../../src/types';
import { shiftService } from '../services/shiftService';

const BALANCES_COLLECTION = 'leave_balances';
const LEDGER_COLLECTION = 'leave_ledger';

export const leaveLedgerRepository = {
  /**
   * Get or initialize leave balance for employee, ensuring monthly entitlement is credited (+2 days/month)
   */
  async getBalance(employeeId: string, employeeName?: string, department?: string): Promise<LeaveBalance> {
    const cleanId = employeeId.toUpperCase().trim();

    if (isRemoteFirestoreActive()) {
      try {
        const docRef = adminDb.collection(BALANCES_COLLECTION).doc(cleanId);
        const snap = await docRef.get();

        let balance: LeaveBalance;
        if (!snap.exists) {
          balance = {
            employeeId: cleanId,
            employeeName: employeeName || cleanId,
            department: department || '',
            openingBalance: 0,
            monthlyEntitlement: 0,
            carryForward: 0,
            paidUsed: 0,
            paidRemaining: 0,
            approvedUnpaid: 0,
            creditedMonths: [],
            updatedAt: new Date().toISOString(),
          };
          await docRef.set(balance);
          storageEngine.setDoc(BALANCES_COLLECTION, cleanId, balance);
        } else {
          balance = snap.data() as LeaveBalance;
          storageEngine.setDoc(BALANCES_COLLECTION, cleanId, balance);
        }

        balance = await this.ensureMonthlyEntitlement(balance);
        return balance;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    let localBalance = storageEngine.getDoc<LeaveBalance>(BALANCES_COLLECTION, cleanId);
    if (!localBalance) {
      localBalance = {
        employeeId: cleanId,
        employeeName: employeeName || cleanId,
        department: department || '',
        openingBalance: 0,
        monthlyEntitlement: 0,
        carryForward: 0,
        paidUsed: 0,
        paidRemaining: 0,
        approvedUnpaid: 0,
        creditedMonths: [],
        updatedAt: new Date().toISOString(),
      };
      storageEngine.setDoc(BALANCES_COLLECTION, cleanId, localBalance);
    }

    localBalance = await this.ensureMonthlyEntitlement(localBalance);
    return localBalance;
  },

  /**
   * Idempotent +2 days per month entitlement credit
   */
  async ensureMonthlyEntitlement(balance: LeaveBalance): Promise<LeaveBalance> {
    const istParts = shiftService.getISTDateParts();
    const currentYearMonth = istParts.yearMonth; // e.g. "2026-08"

    // Generate list of months from start of year or Jan 2026 to current month
    const [yearStr, monthStr] = currentYearMonth.split('-');
    const currentYear = parseInt(yearStr, 10);
    const currentMonthNum = parseInt(monthStr, 10);

    const neededMonths: string[] = [];
    for (let m = 1; m <= currentMonthNum; m++) {
      neededMonths.push(`${currentYear}-${String(m).padStart(2, '0')}`);
    }

    const uncreditedMonths = neededMonths.filter((m) => !(balance.creditedMonths || []).includes(m));

    if (uncreditedMonths.length > 0) {
      let addedDays = 0;
      const updatedCredited = [...(balance.creditedMonths || [])];

      for (const month of uncreditedMonths) {
        addedDays += 2;
        updatedCredited.push(month);

        // Record ledger entry
        const entryId = `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const ledgerEntry: LeaveLedgerEntry = {
          id: entryId,
          employeeId: balance.employeeId,
          employeeName: balance.employeeName,
          type: 'MONTHLY_ENTITLEMENT',
          amount: 2,
          balanceAfter: balance.paidRemaining + addedDays,
          month,
          note: `Monthly Paid Leave Entitlement (+2.0 days) for ${month}`,
          createdAt: new Date().toISOString(),
        };

        storageEngine.setDoc(LEDGER_COLLECTION, entryId, ledgerEntry);

        if (isRemoteFirestoreActive()) {
          try {
            await adminDb.collection(LEDGER_COLLECTION).doc(entryId).set(ledgerEntry);
          } catch (err: any) {
            if (isFirestorePermissionOrNetworkError(err)) {
              markFirestoreUnavailable(err);
            }
          }
        }
      }

      const newEntitlement = (balance.monthlyEntitlement || 0) + addedDays;
      const newRemaining = balance.paidRemaining + addedDays;

      const updatedBalance: LeaveBalance = {
        ...balance,
        monthlyEntitlement: newEntitlement,
        paidRemaining: newRemaining,
        carryForward: newRemaining, // Unused carry forward without reset
        creditedMonths: updatedCredited,
        updatedAt: new Date().toISOString(),
      };

      storageEngine.setDoc(BALANCES_COLLECTION, balance.employeeId, updatedBalance);

      if (isRemoteFirestoreActive()) {
        try {
          await adminDb.collection(BALANCES_COLLECTION).doc(balance.employeeId).set(updatedBalance);
        } catch (err: any) {
          if (isFirestorePermissionOrNetworkError(err)) {
            markFirestoreUnavailable(err);
          }
        }
      }

      return updatedBalance;
    }

    return balance;
  },

  /**
   * Concurrency-safe atomic deduction of approved leave
   */
  async applyLeaveDeduction(
    employeeId: string,
    eligibleDays: number,
    leaveId: string,
    note?: string
  ): Promise<{ paidDays: number; unpaidDays: number; remainingBalance: number }> {
    const cleanId = employeeId.toUpperCase().trim();

    if (isRemoteFirestoreActive()) {
      try {
        const docRef = adminDb.collection(BALANCES_COLLECTION).doc(cleanId);
        return await adminDb.runTransaction(async (transaction) => {
          const snap = await transaction.get(docRef);
          let currentBalance: LeaveBalance;

          if (!snap.exists) {
            currentBalance = {
              employeeId: cleanId,
              openingBalance: 0,
              monthlyEntitlement: 0,
              carryForward: 0,
              paidUsed: 0,
              paidRemaining: 0,
              approvedUnpaid: 0,
              creditedMonths: [],
              updatedAt: new Date().toISOString(),
            };
          } else {
            currentBalance = snap.data() as LeaveBalance;
          }

          const availableBalance = Math.max(0, currentBalance.paidRemaining || 0);
          const paidDays = Math.min(availableBalance, eligibleDays);
          const unpaidDays = Math.max(0, eligibleDays - paidDays);
          const newRemaining = availableBalance - paidDays;
          const newPaidUsed = (currentBalance.paidUsed || 0) + paidDays;
          const newApprovedUnpaid = (currentBalance.approvedUnpaid || 0) + unpaidDays;

          const updatedDoc: LeaveBalance = {
            ...currentBalance,
            paidRemaining: newRemaining,
            paidUsed: newPaidUsed,
            approvedUnpaid: newApprovedUnpaid,
            carryForward: newRemaining,
            updatedAt: new Date().toISOString(),
          };

          transaction.set(docRef, updatedDoc);
          storageEngine.setDoc(BALANCES_COLLECTION, cleanId, updatedDoc);

          if (paidDays > 0) {
            const entryId = `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const ledgerRef = adminDb.collection(LEDGER_COLLECTION).doc(entryId);
            const ledgerDoc: LeaveLedgerEntry = {
              id: entryId,
              employeeId: cleanId,
              employeeName: currentBalance.employeeName,
              type: 'LEAVE_DEBIT',
              amount: -paidDays,
              balanceAfter: newRemaining,
              leaveId,
              note: note || `Approved Leave Deduction (${paidDays} Paid Days, ${unpaidDays} Unpaid Days)`,
              createdAt: new Date().toISOString(),
            };
            transaction.set(ledgerRef, ledgerDoc);
            storageEngine.setDoc(LEDGER_COLLECTION, entryId, ledgerDoc);
          }

          return {
            paidDays,
            unpaidDays,
            remainingBalance: newRemaining,
          };
        });
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    // Local resilient path
    let currentBalance = storageEngine.getDoc<LeaveBalance>(BALANCES_COLLECTION, cleanId);
    if (!currentBalance) {
      currentBalance = {
        employeeId: cleanId,
        openingBalance: 0,
        monthlyEntitlement: 0,
        carryForward: 0,
        paidUsed: 0,
        paidRemaining: 0,
        approvedUnpaid: 0,
        creditedMonths: [],
        updatedAt: new Date().toISOString(),
      };
    }

    const availableBalance = Math.max(0, currentBalance.paidRemaining || 0);
    const paidDays = Math.min(availableBalance, eligibleDays);
    const unpaidDays = Math.max(0, eligibleDays - paidDays);
    const newRemaining = availableBalance - paidDays;
    const newPaidUsed = (currentBalance.paidUsed || 0) + paidDays;
    const newApprovedUnpaid = (currentBalance.approvedUnpaid || 0) + unpaidDays;

    const updatedDoc: LeaveBalance = {
      ...currentBalance,
      paidRemaining: newRemaining,
      paidUsed: newPaidUsed,
      approvedUnpaid: newApprovedUnpaid,
      carryForward: newRemaining,
      updatedAt: new Date().toISOString(),
    };

    storageEngine.setDoc(BALANCES_COLLECTION, cleanId, updatedDoc);

    if (paidDays > 0) {
      const entryId = `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const ledgerDoc: LeaveLedgerEntry = {
        id: entryId,
        employeeId: cleanId,
        employeeName: currentBalance.employeeName,
        type: 'LEAVE_DEBIT',
        amount: -paidDays,
        balanceAfter: newRemaining,
        leaveId,
        note: note || `Approved Leave Deduction (${paidDays} Paid Days, ${unpaidDays} Unpaid Days)`,
        createdAt: new Date().toISOString(),
      };
      storageEngine.setDoc(LEDGER_COLLECTION, entryId, ledgerDoc);
    }

    return {
      paidDays,
      unpaidDays,
      remainingBalance: newRemaining,
    };
  },

  /**
   * Get employee's complete immutable leave ledger entries
   */
  async getLedger(employeeId: string): Promise<LeaveLedgerEntry[]> {
    const cleanId = employeeId.toUpperCase().trim();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(LEDGER_COLLECTION).get();
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as LeaveLedgerEntry));
        for (const e of list) storageEngine.setDoc(LEDGER_COLLECTION, e.id, e);
        return list
          .filter((e) => (e.employeeId || '').toUpperCase() === cleanId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const list = storageEngine.queryDocs<LeaveLedgerEntry>(
      LEDGER_COLLECTION,
      (e) => (e.employeeId || '').toUpperCase() === cleanId
    );
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Admin: Get all employee balances
   */
  async getAllBalances(): Promise<LeaveBalance[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(BALANCES_COLLECTION).get();
        const list = snap.docs.map((d) => ({ ...d.data(), employeeId: d.id } as LeaveBalance));
        for (const b of list) storageEngine.setDoc(BALANCES_COLLECTION, b.employeeId, b);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.getAllDocs<LeaveBalance>(BALANCES_COLLECTION);
  },
};
