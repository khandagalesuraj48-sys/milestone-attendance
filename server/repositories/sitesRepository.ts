import { adminDb } from '../firebaseAdmin';
import {
  storageEngine,
  isRemoteFirestoreActive,
  markFirestoreUnavailable,
  isFirestorePermissionOrNetworkError,
} from '../lib/storageEngine';
import { Site } from '../../src/types';

const COLLECTION = 'sites';

export const sitesRepository = {
  async getById(siteId: string): Promise<Site | null> {
    const clean = siteId.trim();

    if (isRemoteFirestoreActive()) {
      try {
        const doc = await adminDb.collection(COLLECTION).doc(clean).get();
        if (doc.exists) {
          const site = { ...doc.data(), siteId: doc.id } as Site;
          storageEngine.setDoc(COLLECTION, clean, site);
          return site;
        }
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.getDoc<Site>(COLLECTION, clean);
  },

  async getAll(): Promise<Site[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(COLLECTION).get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), siteId: doc.id } as Site));
        for (const s of list) storageEngine.setDoc(COLLECTION, s.siteId, s);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.getAllDocs<Site>(COLLECTION);
  },

  async getActive(): Promise<Site[]> {
    if (isRemoteFirestoreActive()) {
      try {
        const snap = await adminDb.collection(COLLECTION).where('isActive', '==', true).get();
        const list = snap.docs.map((doc) => ({ ...doc.data(), siteId: doc.id } as Site));
        for (const s of list) storageEngine.setDoc(COLLECTION, s.siteId, s);
        return list;
      } catch (err: any) {
        if (isFirestorePermissionOrNetworkError(err)) {
          markFirestoreUnavailable(err);
        }
      }
    }

    return storageEngine.queryDocs<Site>(COLLECTION, (s) => s.isActive !== false);
  },

  async create(site: Site): Promise<Site> {
    const cleanId = site.siteId.trim();
    const docData: Site = {
      ...site,
      siteId: cleanId,
      createdAt: site.createdAt || new Date().toISOString(),
      updatedAt: site.updatedAt || new Date().toISOString(),
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

  async update(siteId: string, updates: Partial<Site>): Promise<void> {
    const clean = siteId.trim();
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

  async delete(siteId: string): Promise<void> {
    const clean = siteId.trim();
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
