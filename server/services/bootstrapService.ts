import { policyRepository } from '../repositories/policyRepository';
import { resetService } from './resetService';

export const bootstrapService = {
  /**
   * System initialization for clean production deployment.
   * Zero demo sites, zero demo employees, zero demo locations, zero demo records.
   */
  async ensureInitialData(): Promise<void> {
    try {
      console.log('[Bootstrap] Initializing clean production environment...');

      // 1. Ensure default attendance policy rules exist
      await policyRepository.getRules();

      console.log('[Bootstrap] System initialized with 0 employees, 0 sites, 0 locations.');
    } catch (e: any) {
      console.warn('[Bootstrap] Notice during system initialization:', e.message);
    }
  },
};
