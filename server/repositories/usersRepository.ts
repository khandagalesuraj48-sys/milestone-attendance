import { adminDb } from '../firebaseAdmin';
import { User } from '../../src/types';

const COLLECTION = 'users';

export const usersRepository = {
  async getByUid(uid: string): Promise<User | null> {
    const doc = await adminDb.collection(COLLECTION).doc(uid).get();
    if (!doc.exists) return null;
    return { ...doc.data(), uid: doc.id, id: doc.id } as User;
  },

  async getByUsername(username: string): Promise<User | null> {
    const clean = username.trim().toLowerCase();
    const snap = await adminDb
      .collection(COLLECTION)
      .where('username', '==', clean)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { ...doc.data(), uid: doc.id, id: doc.id } as User;
  },

  async getByEmployeeId(employeeId: string): Promise<User | null> {
    const clean = employeeId.trim().toUpperCase();
    const snap = await adminDb
      .collection(COLLECTION)
      .where('employeeId', '==', clean)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { ...doc.data(), uid: doc.id, id: doc.id } as User;
  },

  async getByEmail(email: string): Promise<User | null> {
    const clean = email.trim().toLowerCase();
    const snap = await adminDb
      .collection(COLLECTION)
      .where('email', '==', clean)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { ...doc.data(), uid: doc.id, id: doc.id } as User;
  },

  async getAll(): Promise<User[]> {
    const snap = await adminDb.collection(COLLECTION).get();
    return snap.docs.map((doc) => ({ ...doc.data(), uid: doc.id, id: doc.id } as User));
  },

  async create(uid: string, data: Partial<User>): Promise<User> {
    const userDoc: User = {
      id: uid,
      uid,
      employeeId: data.employeeId || 'ADMIN',
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
    await adminDb.collection(COLLECTION).doc(uid).set(userDoc);
    return userDoc;
  },

  async update(uid: string, updates: Partial<User>): Promise<void> {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await adminDb.collection(COLLECTION).doc(uid).set(payload, { merge: true });
  },

  async delete(uid: string): Promise<void> {
    await adminDb.collection(COLLECTION).doc(uid).delete();
  },
};
