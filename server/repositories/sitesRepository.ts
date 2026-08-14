import { adminDb } from '../firebaseAdmin';
import { Site } from '../../src/types';

const COLLECTION = 'sites';

export const sitesRepository = {
  async getById(siteId: string): Promise<Site | null> {
    const clean = siteId.trim();
    const doc = await adminDb.collection(COLLECTION).doc(clean).get();
    if (!doc.exists) return null;
    return { ...doc.data(), siteId: doc.id } as Site;
  },

  async getAll(): Promise<Site[]> {
    const snap = await adminDb.collection(COLLECTION).get();
    return snap.docs.map((doc) => ({ ...doc.data(), siteId: doc.id } as Site));
  },

  async getActive(): Promise<Site[]> {
    const snap = await adminDb.collection(COLLECTION).where('isActive', '==', true).get();
    return snap.docs.map((doc) => ({ ...doc.data(), siteId: doc.id } as Site));
  },

  async create(site: Site): Promise<Site> {
    const cleanId = site.siteId.trim();
    const docData: Site = {
      ...site,
      siteId: cleanId,
      createdAt: site.createdAt || new Date().toISOString(),
      updatedAt: site.updatedAt || new Date().toISOString(),
    };
    await adminDb.collection(COLLECTION).doc(cleanId).set(docData);
    return docData;
  },

  async update(siteId: string, updates: Partial<Site>): Promise<void> {
    const clean = siteId.trim();
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await adminDb.collection(COLLECTION).doc(clean).set(payload, { merge: true });
  },
};
