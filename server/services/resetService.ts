import { adminDb, adminAuth } from '../firebaseAdmin';
import { storageEngine, isRemoteFirestoreActive } from '../lib/storageEngine';
import { usersRepository } from '../repositories/usersRepository';
import { User } from '../../src/types';

export const resetService = {
  /**
   * Complete application business data purge for fresh start.
   * Clears old business data (employees, attendance, sites, locations, devices, leaves, etc.)
   * PRESERVES: Existing Admin Firebase Auth user(s) and their Admin profile so the existing admin account remains usable.
   */
  async purgeAllData(): Promise<{ success: boolean; deletedCollections: Record<string, number>; totalDocsDeleted: number }> {
    const collectionsToPurge = [
      'employees',
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

    // First, preserve all existing Admin profiles before modifying users collection
    const existingUsers = await usersRepository.getAll();
    const existingAdminProfiles = existingUsers.filter((u) => u.role === 'admin');

    if (isRemoteFirestoreActive()) {
      for (const colName of collectionsToPurge) {
        try {
          const snapshot = await adminDb.collection(colName).get();
          if (!snapshot.empty) {
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

      // In the 'users' collection: ONLY delete non-admin (employee) user profiles. NEVER delete Admin users.
      try {
        const usersSnap = await adminDb.collection('users').get();
        if (!usersSnap.empty) {
          let userDocsDeleted = 0;
          const batch = adminDb.batch();
          for (const doc of usersSnap.docs) {
            const data = doc.data();
            if (data.role !== 'admin') {
              batch.delete(doc.ref);
              userDocsDeleted++;
            }
          }
          if (userDocsDeleted > 0) {
            await batch.commit();
          }
          deletedCounts['users (employees only)'] = userDocsDeleted;
          totalDocs += userDocsDeleted;
          console.log(`[ResetService] Purged ${userDocsDeleted} non-admin user records, preserved Admin profile(s).`);
        }
      } catch (err: any) {
        console.warn(`[ResetService] Notice clearing employee users:`, err.message);
      }

      // For Firebase Authentication: ONLY delete non-admin users. NEVER delete existing Admin accounts.
      try {
        const adminUids = new Set(existingAdminProfiles.map((a) => a.uid));
        let nextPageToken: string | undefined;
        do {
          const userRecords = await adminAuth.listUsers(100, nextPageToken);
          for (const user of userRecords.users) {
            // Check if this Auth user is an Admin
            const isAdmin =
              adminUids.has(user.uid) ||
              existingAdminProfiles.some((a) => (a.email || '').toLowerCase() === (user.email || '').toLowerCase()) ||
              (user.customClaims && (user.customClaims.role === 'admin' || user.customClaims.admin === true));

            if (!isAdmin) {
              try {
                await adminAuth.deleteUser(user.uid);
                console.log(`[ResetService] Deleted non-admin Auth user: ${user.email || user.uid}`);
              } catch (delErr: any) {
                console.warn(`[ResetService] Non-admin Auth user delete error for ${user.uid}:`, delErr.message);
              }
            } else {
              console.log(`[ResetService] PRESERVED existing Admin Auth user: ${user.email || user.uid}`);
            }
          }
          nextPageToken = userRecords.pageToken;
        } while (nextPageToken);
      } catch (authErr: any) {
        console.warn('[ResetService] Notice during selective Auth user purge:', authErr.message);
      }
    }

    // Clear in-memory storage cache for business collections while re-seeding preserved Admin profiles
    storageEngine.clearCache();
    for (const adminProfile of existingAdminProfiles) {
      storageEngine.setDoc('users', adminProfile.uid, adminProfile);
    }

    console.log(`[ResetService] Business data reset complete. Total records cleared: ${totalDocs}. Admin account PRESERVED.`);
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
        isFirstSetupRequired: false, // The existing Firebase Admin account is always active
        adminCount: Math.max(1, adminUsers.length),
        employeeCount: employeeUsers.length,
      };
    } catch {
      return {
        isFirstSetupRequired: false,
        adminCount: 1,
        employeeCount: 0,
      };
    }
  },

  /**
   * Creates the first administrator account if needed
   */
  async setupFirstAdmin(params: {
    username: string;
    password: string;
    fullName: string;
    email?: string;
    mobile?: string;
  }): Promise<{ success: boolean; user: User; message: string }> {
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

    // 1. Create or resolve Firebase Auth user
    let uid: string;
    try {
      let existingAuthUser = null;
      try {
        existingAuthUser = await adminAuth.getUserByEmail(cleanEmail);
      } catch {}

      if (existingAuthUser) {
        uid = existingAuthUser.uid;
        // Update password for the existing admin account
        await adminAuth.updateUser(uid, { password: cleanPassword, displayName: cleanFullName });
      } else {
        const authRecord = await adminAuth.createUser({
          email: cleanEmail,
          password: cleanPassword,
          displayName: cleanFullName,
        });
        uid = authRecord.uid;
      }
    } catch (authErr: any) {
      console.error('[ResetService] Auth user handling note:', authErr);
      throw new Error(`Failed to configure administrator auth account: ${authErr.message}`);
    }

    // 2. Create or update authoritative Firestore User profile
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

    console.log(`[ResetService] Successfully confirmed administrator: ${cleanUsername} (${cleanEmail})`);

    return {
      success: true,
      user: adminUser,
      message: 'Administrator account confirmed. You may now sign in using your existing admin credentials.',
    };
  },
};
