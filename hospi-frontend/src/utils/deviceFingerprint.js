/**
 * 📱 Device Fingerprint — Génère un identifiant unique stable par appareil.
 * Basé sur le navigateur, l'OS, la résolution et un hash combiné.
 * Stocké dans localStorage pour la persistance.
 */

const STORAGE_KEY = 'inua_device_id';

function generateDeviceId() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform || 'unknown',
  ];

  const raw = components.join('::');
  // Simple hash (djb2-like)
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) + raw.charCodeAt(i);
    hash = hash & 0xFFFFFFFF; // 32-bit
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return 'dev_' + hex + '_' + Math.random().toString(36).substring(2, 8);
}

export function getDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateDeviceId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Fallback si localStorage indisponible
    return generateDeviceId();
  }
}

export function resetDeviceId() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
