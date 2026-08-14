import { adminDb } from '../firebaseAdmin';
import { LocationSite } from '../../src/types';

const COLLECTION = 'locations';

export const locationsRepository = {
  async getById(locationId: string): Promise<LocationSite | null> {
    const clean = locationId.trim();
    const doc = await adminDb.collection(COLLECTION).doc(clean).get();
    if (!doc.exists) return null;
    return { ...doc.data(), locationId: doc.id, id: doc.id } as LocationSite;
  },

  async getAll(): Promise<LocationSite[]> {
    const snap = await adminDb.collection(COLLECTION).get();
    return snap.docs.map((doc) => ({ ...doc.data(), locationId: doc.id, id: doc.id } as LocationSite));
  },

  async getActive(): Promise<LocationSite[]> {
    const snap = await adminDb.collection(COLLECTION).where('isActive', '==', true).get();
    return snap.docs.map((doc) => ({ ...doc.data(), locationId: doc.id, id: doc.id } as LocationSite));
  },

  async getBySiteId(siteId: string): Promise<LocationSite[]> {
    const clean = siteId.trim();
    const snap = await adminDb.collection(COLLECTION).where('siteId', '==', clean).get();
    return snap.docs.map((doc) => ({ ...doc.data(), locationId: doc.id, id: doc.id } as LocationSite));
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
    await adminDb.collection(COLLECTION).doc(cleanId).set(docData);
    return docData;
  },

  async update(locationId: string, updates: Partial<LocationSite>): Promise<void> {
    const clean = locationId.trim();
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await adminDb.collection(COLLECTION).doc(clean).set(payload, { merge: true });
  },
};
