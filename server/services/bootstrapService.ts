import { sitesRepository } from '../repositories/sitesRepository';
import { locationsRepository } from '../repositories/locationsRepository';
import { policyRepository } from '../repositories/policyRepository';
import { Site, LocationSite } from '../../src/types';

export const bootstrapService = {
  /**
   * Initializes non-sensitive organizational configuration (sites, geofences, attendance policies)
   * Production never creates sample users or hardcoded credentials.
   */
  async ensureInitialData(): Promise<void> {
    try {
      console.log('[Bootstrap] Initializing organizational configuration verification...');

      // 1. Ensure Default Attendance Policy Rules
      await policyRepository.getRules();

      // 2. Ensure Default Enterprise Sites
      const existingSites = await sitesRepository.getAll();
      if (existingSites.length === 0) {
        const defaultSites: Site[] = [
          {
            siteId: 'SITE_MUMBAI_HO',
            siteName: 'Mumbai Corporate Headquarters',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            siteId: 'SITE_PALGHAR_INFRA',
            siteName: 'Palghar Industrial & Infra Project',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            siteId: 'SITE_THANE_METRO',
            siteName: 'Thane Metro Station Site',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            siteId: 'SITE_NAVI_MUMBAI_SEZ',
            siteName: 'Navi Mumbai SEZ Commercial Hub',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        for (const site of defaultSites) {
          await sitesRepository.create(site);
        }
        console.log('[Bootstrap] Provisioned 4 default project sites.');
      }

      // 3. Ensure Default Locations with Authorized Geofences
      const existingLocations = await locationsRepository.getAll();
      if (existingLocations.length === 0) {
        const defaultLocations: LocationSite[] = [
          {
            locationId: 'LOC_MUMBAI_HO_MAIN',
            id: 'LOC_MUMBAI_HO_MAIN',
            siteId: 'SITE_MUMBAI_HO',
            siteName: 'Mumbai Corporate Headquarters',
            locationName: 'BKC Corporate Tower - 8th Floor',
            name: 'BKC Corporate Tower - 8th Floor',
            address: 'G Block, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051',
            latitude: 19.0657,
            longitude: 72.8687,
            radiusMeters: 250,
            accuracyThresholdMeters: 100,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            locationId: 'LOC_PALGHAR_YARD_A',
            id: 'LOC_PALGHAR_YARD_A',
            siteId: 'SITE_PALGHAR_INFRA',
            siteName: 'Palghar Industrial & Infra Project',
            locationName: 'Palghar Fabrication Yard & Storage',
            name: 'Palghar Fabrication Yard & Storage',
            address: 'Plot 42, MIDC Industrial Area, Tarapur, Palghar, Maharashtra 401506',
            latitude: 18.6570,
            longitude: 72.8790,
            radiusMeters: 300,
            accuracyThresholdMeters: 100,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            locationId: 'LOC_THANE_PLATFORM_1',
            id: 'LOC_THANE_PLATFORM_1',
            siteId: 'SITE_THANE_METRO',
            siteName: 'Thane Metro Station Site',
            locationName: 'Thane Majiwada Station Construction',
            name: 'Thane Majiwada Station Construction',
            address: 'Eastern Express Hwy, Majiwada, Thane West, Maharashtra 400601',
            latitude: 19.2183,
            longitude: 72.9781,
            radiusMeters: 250,
            accuracyThresholdMeters: 100,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            locationId: 'LOC_NAVI_MUMBAI_BLOCK_C',
            id: 'LOC_NAVI_MUMBAI_BLOCK_C',
            siteId: 'SITE_NAVI_MUMBAI_SEZ',
            siteName: 'Navi Mumbai SEZ Commercial Hub',
            locationName: 'Airoli Knowledge Park - Block C',
            name: 'Airoli Knowledge Park - Block C',
            address: 'Airoli Knowledge Park Rd, TTC Industrial Area, MIDC Industrial Area, Airoli, Navi Mumbai 400708',
            latitude: 19.1551,
            longitude: 72.9986,
            radiusMeters: 200,
            accuracyThresholdMeters: 100,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        for (const loc of defaultLocations) {
          await locationsRepository.create(loc);
        }
        console.log('[Bootstrap] Provisioned default geofence locations.');
      }

      console.log('[Bootstrap] Organizational policy and site initialization complete.');
    } catch (e: any) {
      console.warn('[Bootstrap] Notice during initial configuration check:', e.message);
    }
  },
};
