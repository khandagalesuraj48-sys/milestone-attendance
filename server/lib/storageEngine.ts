import { adminDb } from '../firebaseAdmin';
import {
  User,
  Employee,
  Site,
  LocationSite,
  AttendanceRules,
  Holiday,
} from '../../src/types';

// StorageEngine is now purely an in-memory cache layer for ephemeral read optimization.
// Firebase Firestore is the EXCLUSIVE authoritative source of truth.
// If Firestore is unreachable, all writes fail closed immediately.
const store = new Map<string, Map<string, any>>();

let isFirestoreAvailable = true;

/**
 * Checks whether an error is a Firebase Firestore permission or network connectivity issue
 */
export function isFirestorePermissionOrNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = err.code;
  return (
    code === 7 || // PERMISSION_DENIED
    code === 14 || // UNAVAILABLE
    code === 16 || // UNAUTHENTICATED
    code === 4 || // DEADLINE_EXCEEDED
    code === 'permission-denied' ||
    code === 'unavailable' ||
    msg.includes('permission_denied') ||
    msg.includes('insufficient permissions') ||
    msg.includes('missing or insufficient permissions') ||
    msg.includes('could not reach cloud firestore') ||
    msg.includes('unavailable') ||
    msg.includes('auth error') ||
    msg.includes('credential')
  );
}

export function markFirestoreUnavailable(err?: any) {
  isFirestoreAvailable = false;
  console.error('[StorageEngine] Firestore error encountered:', err?.message || err);
}

export function markFirestoreAvailable() {
  isFirestoreAvailable = true;
}

export function isRemoteFirestoreActive(): boolean {
  return isFirestoreAvailable;
}

// Ensure collection map exists
function getColMap(collectionName: string): Map<string, any> {
  if (!store.has(collectionName)) {
    store.set(collectionName, new Map<string, any>());
  }
  return store.get(collectionName)!;
}

export const storageEngine = {
  getDoc<T = any>(collection: string, docId: string): T | null {
    const col = getColMap(collection);
    const data = col.get(docId);
    return data ? (JSON.parse(JSON.stringify(data)) as T) : null;
  },

  setDoc<T = any>(collection: string, docId: string, data: T, merge = false): T {
    const col = getColMap(collection);
    let finalData = data;
    if (merge && col.has(docId)) {
      finalData = { ...col.get(docId), ...data };
    }
    col.set(docId, JSON.parse(JSON.stringify(finalData)));
    return finalData;
  },

  updateDoc(collection: string, docId: string, updates: Record<string, any>): void {
    const col = getColMap(collection);
    const current = col.get(docId) || {};
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    col.set(docId, JSON.parse(JSON.stringify(updated)));
  },

  deleteDoc(collection: string, docId: string): void {
    const col = getColMap(collection);
    col.delete(docId);
  },

  getAllDocs<T = any>(collection: string): T[] {
    const col = getColMap(collection);
    return Array.from(col.values()).map((v) => JSON.parse(JSON.stringify(v)) as T);
  },

  queryDocs<T = any>(collection: string, filterFn: (item: T) => boolean): T[] {
    const all = (this.getAllDocs as <K = T>(col: string) => K[])(collection);
    return all.filter(filterFn);
  },

  findDoc<T = any>(collection: string, predicate: (item: T) => boolean): T | null {
    const all = (this.getAllDocs as <K = T>(col: string) => K[])(collection);
    for (const item of all) {
      if (predicate(item)) return item;
    }
    return null;
  },

  clearCache(): void {
    store.clear();
  },
};

