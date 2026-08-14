// Web Installation Token Generator for 1:1 Device Binding

const DEVICE_STORAGE_KEY = 'msc_web_installation_token_v49';

export function getOrCreateInstallationKey(): string {
  try {
    let key = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!key) {
      key = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(DEVICE_STORAGE_KEY, key);
    }
    return key;
  } catch {
    return `inst_fallback_${Date.now()}`;
  }
}

export function resetLocalInstallationKey(): string {
  try {
    const newKey = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem(DEVICE_STORAGE_KEY, newKey);
    return newKey;
  } catch {
    return `inst_fallback_${Date.now()}`;
  }
}
