import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { User } from '../../src/types';

const COLLECTION = 'users';

export const usersRepository = {
  async getByUid(uid: string): Promise<User | null> {
    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(COLLECTION).doc(uid).get();
        if (doc.exists) {
          const user = { ...doc.data(), uid: doc.id, id: doc.id } as User;
          storageEngine.setDoc(COLLECTION, uid, user);
          return user;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        } else {
          console.warn('[usersRepository.getByUid] Firestore notice:', err.message);
        }
      }
    }

    // High-availability Local Store lookup
    const local = storageEngine.getDoc<User>(COLLECTION, uid);
    if (local) return local;

    // Search by matching id or other attributes if UID was mapped
    const all = storageEngine.getAllDocs<User>(COLLECTION);
    return all.find((u) => u.uid === uid || u.id === uid) || null;
  },

  async getByUsername(username: string): Promise<User | null> {
    const clean = username.trim().toLowerCase();
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .where('username', '==', clean)
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const user = { ...doc.data(), uid: doc.id, id: doc.id } as User;
          storageEngine.setDoc(COLLECTION, doc.id, user);
          return user;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return (
      storageEngine.findDoc<User>(
        COLLECTION,
        (u) => (u.username || '').toLowerCase() === clean
      ) || null
    );
  },

  async getByEmployeeId(employeeId: string): Promise<User | null> {
    const clean = employeeId.trim().toUpperCase();
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .where('employeeId', '==', clean)
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const user = { ...doc.data(), uid: doc.id, id: doc.id } as User;
          storageEngine.setDoc(COLLECTION, doc.id, user);
          return user;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return (
      storageEngine.findDoc<User>(
        COLLECTION,
        (u) => (u.employeeId || '').toUpperCase() === clean
      ) || null
    );
  },

  async getByEmail(email: string): Promise<User | null> {
    const clean = email.trim().toLowerCase();
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb
          .collection(COLLECTION)
          .where('email', '==', clean)
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const user = { ...doc.data(), uid: doc.id, id: doc.id } as User;
          storageEngine.setDoc(COLLECTION, doc.id, user);
          return user;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return (
      storageEngine.findDoc<User>(
        COLLECTION,
        (u) => (u.email || '').toLowerCase() === clean
      ) || null
    );
  },

  async getAll(): Promise<User[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(COLLECTION).get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), uid: doc.id, id: doc.id } as User));
        for (const u of list) storageEngine.setDoc(COLLECTION, u.uid, u);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.getAllDocs<User>(COLLECTION);
  },

  async create(uid: string, data: Partial<User>): Promise<User> {
    const userDoc: User = {
      id: uid,
      uid,
      employeeId: data.employeeId || 'ADMIN-01',
      username: (data.username || '').toLowerCase().trim(),
      email: (data.email || '').toLowerCase().trim(),
      fullName: data.fullName || '',
      role: data.role || 'employee',
      mustChangePassword: data.mustChangePassword ?? false,
      accountStatus: data.accountStatus || 'ACTIVE',
      lastLoginAt: data.lastLoginAt || new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    storageEngine.setDoc(COLLECTION, uid, userDoc);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(COLLECTION).doc(uid).set(userDoc);
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return userDoc;
  },

  async update(uid: string, updates: Partial<User>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageEngine.updateDoc(COLLECTION, uid, payload);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(COLLECTION).doc(uid).set(payload, { merge: true });
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },

  async delete(uid: string): Promise<void> {
    storageEngine.deleteDoc(COLLECTION, uid);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(COLLECTION).doc(uid).delete();
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },
};
