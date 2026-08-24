import { adminDb, adminAuth } from '../firebaseAdmin';
import { storageEngine, isRemoteFirestoreActive } from '../lib/storageEngine';
import { usersRepository } from '../repositories/usersRepository';
import { User } from '../../src/types';

export const resetService = {
  /**
   * Complete application data purge for fresh start.
   * Deletes all business collections and application auth accounts.
   */
  async purgeAllData(): Promise<{ success: boolean; deletedCollections: Record<string, number>; totalDocsDeleted: number }> {
    const collectionsToPurge = [
      'employees',
      'users',
      'attendance',
      'attendance_sessions',
      'attendance_records',
      'attendance_corrections',
      'regularization',
      'sites',
      'locations',
      'devices',
      'device_reset_requests',
      'leaves',
      'leave_balances',
      'leave_ledger',
      'audit',
      'audit_logs',
      'notifications',
      'holidays',
      'payroll_runs',
      'payroll_items',
      'master_register',
      'master_register_summaries',
      'master_register_entries',
      'storage_files',
      'files',
      'security_events',
      'projects',
    ];

    const deletedCounts: Record<string, number> = {};
    let totalDocs = 0;

    if (isRemoteFirestoreActive()) {
      for (const colName of collectionsToPurge) {
        try {
          const snapshot = await adminDb.collection(colName).get();
          if (!snapshot.empty) {
            // Delete in batches of 400
            const batchSize = 400;
            const docs = snapshot.docs;
            for (let i = 0; i < docs.length; i += batchSize) {
              const batch = adminDb.batch();
              const chunk = docs.slice(i, i + batchSize);
              chunk.forEach((doc) => batch.delete(doc.ref));
              await batch.commit();
            }
            deletedCounts[colName] = docs.length;
            totalDocs += docs.length;
            console.log(`[ResetService] Deleted ${docs.length} documents from Firestore collection '${colName}'`);
          } else {
            deletedCounts[colName] = 0;
          }
        } catch (err: any) {
          console.warn(`[ResetService] Notice clearing collection '${colName}':`, err.message);
          deletedCounts[colName] = 0;
        }
      }

      // Clear all Firebase Auth accounts for this application
      try {
        let nextPageToken: string | undefined;
        do {
          const userRecords = await adminAuth.listUsers(100, nextPageToken);
          for (const user of userRecords.users) {
            try {
              await adminAuth.deleteUser(user.uid);
              console.log(`[ResetService] Deleted Auth user: ${user.email || user.uid}`);
            } catch (delErr: any) {
              console.warn(`[ResetService] Auth user delete error for ${user.uid}:`, delErr.message);
            }
          }
          nextPageToken = userRecords.pageToken;
        } while (nextPageToken);
      } catch (authErr: any) {
        console.warn('[ResetService] Notice during Auth user purge:', authErr.message);
      }
    }

    // Clear in-memory storage cache
    storageEngine.clearCache();

    console.log(`[ResetService] Complete data purge completed. Total documents removed: ${totalDocs}`);
    return {
      success: true,
      deletedCollections: deletedCounts,
      totalDocsDeleted: totalDocs,
    };
  },

  /**
   * Check if the application requires first-time admin setup
   */
  async getSystemSetupStatus(): Promise<{ isFirstSetupRequired: boolean; adminCount: number; employeeCount: number }> {
    try {
      const allUsers = await usersRepository.getAll();
      const adminUsers = allUsers.filter((u) => u.role === 'admin' && u.accountStatus === 'ACTIVE');
      const employeeUsers = allUsers.filter((u) => u.role === 'employee');

      return {
        isFirstSetupRequired: adminUsers.length === 0,
        adminCount: adminUsers.length,
        employeeCount: employeeUsers.length,
      };
    } catch {
      return {
        isFirstSetupRequired: true,
        adminCount: 0,
        employeeCount: 0,
      };
    }
  },

  /**
   * Creates the first administrator account when admin count is 0
   */
  async setupFirstAdmin(params: {
    username: string;
    password: string;
    fullName: string;
    email?: string;
    mobile?: string;
  }): Promise<{ success: boolean; user: User; message: string }> {
    const status = await this.getSystemSetupStatus();
    if (!status.isFirstSetupRequired) {
      throw new Error('An administrator already exists. Please log in using your admin credentials.');
    }

    const cleanUsername = params.username.trim().toLowerCase();
    const cleanEmail = (params.email || `${cleanUsername}@milestoneconsultancy.in`).trim().toLowerCase();
    const cleanFullName = params.fullName.trim();
    const cleanPassword = params.password.trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      throw new Error('Admin username must be at least 3 characters long.');
    }
    if (!cleanPassword || cleanPassword.length < 8) {
      throw new Error('Admin password must be at least 8 characters long.');
    }
    if (!cleanFullName) {
      throw new Error('Administrator full name is required.');
    }

    // 1. Create Firebase Auth user
    let uid: string;
    try {
      // Check if user exists in auth and delete/reuse if stale
      try {
        const existingAuthUser = await adminAuth.getUserByEmail(cleanEmail);
        if (existingAuthUser) {
          await adminAuth.deleteUser(existingAuthUser.uid);
        }
      } catch {}

      const authRecord = await adminAuth.createUser({
        email: cleanEmail,
        password: cleanPassword,
        displayName: cleanFullName,
      });
      uid = authRecord.uid;
    } catch (authErr: any) {
      console.error('[ResetService] Failed creating admin in Firebase Auth:', authErr);
      throw new Error(`Failed to create administrator auth account: ${authErr.message}`);
    }

    // 2. Create authoritative Firestore User profile
    const nowIso = new Date().toISOString();
    const adminUser: User = {
      uid,
      id: uid,
      employeeId: 'ADM-001',
      username: cleanUsername,
      email: cleanEmail,
      fullName: cleanFullName,
      role: 'admin',
      accountStatus: 'ACTIVE',
      mustChangePassword: false,
      department: 'Executive Leadership',
      designation: 'System Administrator',
      lastLoginAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await usersRepository.create(uid, adminUser);

    console.log(`[ResetService] Successfully initialized first administrator: ${cleanUsername} (${cleanEmail})`);

    return {
      success: true,
      user: adminUser,
      message: 'Administrator account provisioned successfully. You may now sign in to configure projects, sites, and employees.',
    };
  },
};
