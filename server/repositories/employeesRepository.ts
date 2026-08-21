import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { Employee } from '../../src/types';

const COLLECTION = 'employees';

export const employeesRepository = {
  async getById(employeeId: string): Promise<Employee | null> {
    const clean = employeeId.trim().toUpperCase();

    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(COLLECTION).doc(clean).get();
        if (doc.exists) {
          const emp = { ...doc.data(), employeeId: doc.id } as Employee;
          storageEngine.setDoc(COLLECTION, clean, emp);
          return emp;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const local = storageEngine.getDoc<Employee>(COLLECTION, clean);
    if (local) return local;

    const all = storageEngine.getAllDocs<Employee>(COLLECTION);
    return (
      all.find(
        (e) =>
          (e.employeeId || '').toUpperCase() === clean ||
          (e.id || '').toUpperCase() === clean
      ) || null
    );
  },

  async getAll(): Promise<Employee[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(COLLECTION).get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), employeeId: doc.id } as Employee));
        for (const e of list) storageEngine.setDoc(COLLECTION, e.employeeId, e);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.getAllDocs<Employee>(COLLECTION);
  },

  async create(employee: Employee): Promise<Employee> {
    const cleanId = employee.employeeId.trim().toUpperCase();
    const docData: Employee = {
      ...employee,
      employeeId: cleanId,
      createdAt: employee.createdAt || new Date().toISOString(),
      updatedAt: employee.updatedAt || new Date().toISOString(),
    };

    storageEngine.setDoc(COLLECTION, cleanId, docData);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(COLLECTION).doc(cleanId).set(docData);
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return docData;
  },

  async update(employeeId: string, updates: Partial<Employee>): Promise<void> {
    const clean = employeeId.trim().toUpperCase();
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageEngine.updateDoc(COLLECTION, clean, payload);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(COLLECTION).doc(clean).set(payload, { merge: true });
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },

  async delete(employeeId: string): Promise<void> {
    const clean = employeeId.trim().toUpperCase();
    storageEngine.deleteDoc(COLLECTION, clean);

    if (isRemoteFirestoreActive()) {
      try {
        await adminDb.collection(COLLECTION).doc(clean).delete();
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }
  },
};
