import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { LocationSite } from '../../src/types';

const COLLECTION = 'locations';

export const locationsRepository = {
  async getById(locationId: string): Promise<LocationSite | null> {
    const clean = locationId.trim();

    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(COLLECTION).doc(clean).get();
        if (doc.exists) {
          const loc = { ...doc.data(), locationId: doc.id, id: doc.id } as LocationSite;
          storageEngine.setDoc(COLLECTION, clean, loc);
          return loc;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    const local = storageEngine.getDoc<LocationSite>(COLLECTION, clean);
    if (local) return local;

    const all = storageEngine.getAllDocs<LocationSite>(COLLECTION);
    return all.find((l) => l.locationId === clean || l.id === clean) || null;
  },

  async getAll(): Promise<LocationSite[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(COLLECTION).get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), locationId: doc.id, id: doc.id } as LocationSite));
        for (const l of list) storageEngine.setDoc(COLLECTION, l.locationId || l.id, l);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.getAllDocs<LocationSite>(COLLECTION);
  },

  async getActive(): Promise<LocationSite[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(COLLECTION).where('isActive', '==', true).get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), locationId: doc.id, id: doc.id } as LocationSite));
        for (const l of list) storageEngine.setDoc(COLLECTION, l.locationId || l.id, l);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.queryDocs<LocationSite>(COLLECTION, (l) => l.isActive !== false);
  },

  async getBySiteId(siteId: string): Promise<LocationSite[]> {
    const clean = siteId.trim();

    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(COLLECTION).where('siteId', '==', clean).get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), locationId: doc.id, id: doc.id } as LocationSite));
        for (const l of list) storageEngine.setDoc(COLLECTION, l.locationId || l.id, l);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.queryDocs<LocationSite>(COLLECTION, (l) => l.siteId === clean);
  },

  async create(location: LocationSite): Promise<LocationSite> {
    const cleanId = location.locationId ? location.locationId.trim() : (location.id ? location.id.trim() : `loc_${Date.now()}`);
    const docData: LocationSite = {
      ...location,
      locationId: cleanId,
      id: cleanId,
      createdAt: location.createdAt || new Date().toISOString(),
      updatedAt: location.updatedAt || new Date().toISOString(),
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

  async update(locationId: string, updates: Partial<LocationSite>): Promise<void> {
    const clean = locationId.trim();
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
};
