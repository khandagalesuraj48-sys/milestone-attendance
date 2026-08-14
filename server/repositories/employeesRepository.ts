import { adminDb } from '../firebaseAdmin';
import { Employee } from '../../src/types';

const COLLECTION = 'employees';

export const employeesRepository = {
  async getById(employeeId: string): Promise<Employee | null> {
    const clean = employeeId.trim().toUpperCase();
    const doc = await adminDb.collection(COLLECTION).doc(clean).get();
    if (!doc.exists) return null;
    return { ...doc.data(), employeeId: doc.id } as Employee;
  },

  async getAll(): Promise<Employee[]> {
    const snap = await adminDb.collection(COLLECTION).get();
    return snap.docs.map((doc) => ({ ...doc.data(), employeeId: doc.id } as Employee));
  },

  async create(employee: Employee): Promise<Employee> {
    const cleanId = employee.employeeId.trim().toUpperCase();
    const docData: Employee = {
      ...employee,
      employeeId: cleanId,
      createdAt: employee.createdAt || new Date().toISOString(),
      updatedAt: employee.updatedAt || new Date().toISOString(),
    };
    await adminDb.collection(COLLECTION).doc(cleanId).set(docData);
    return docData;
  },

  async update(employeeId: string, updates: Partial<Employee>): Promise<void> {
    const clean = employeeId.trim().toUpperCase();
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await adminDb.collection(COLLECTION).doc(clean).set(payload, { merge: true });
  },

  async delete(employeeId: string): Promise<void> {
    const clean = employeeId.trim().toUpperCase();
    await adminDb.collection(COLLECTION).doc(clean).delete();
  },
};
