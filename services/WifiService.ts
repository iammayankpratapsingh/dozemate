import { Platform } from 'react-native';
import WifiManager from 'react-native-wifi-reborn';


// Optional: quick sanity log to verify native module is loaded
console.log('[WiFi] WifiManager keys:', Object.keys(WifiManager || {}));

export type ScannedNetwork = { ssid: string; bssid?: string; capabilities?: string; level?: number; };
const isSecureCaps = (caps?: string) => !!caps && /(WPA|WEP)/i.test(caps);

async function getLocationModule() {
  try {
    const Location = await import('expo-location');
    // @ts-ignore
    if (!Location || !Location.requestForegroundPermissionsAsync) throw new Error('bad module');
    return Location;
  } catch {
    throw new Error('expo-location native module not available. Rebuild dev client (npx expo run:android) and launch via --dev-client.');
  }
}

export async function ensureWifiScanPermissions(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Location = await getLocationModule();
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Location permission is required to scan Wi‑Fi.');
  const providers = await Location.getProviderStatusAsync();
  if (!providers.locationServicesEnabled) throw new Error('Location service is turned off');
}

function coerceToArray(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return Object.values(parsed as any);
    } catch {}
    return [];
  }
  if (raw && typeof raw === 'object') return Object.values(raw as any);
  return [];
}

export async function scanWifi(): Promise<ScannedNetwork[]> {
  if (Platform.OS === 'ios') return [];
  await ensureWifiScanPermissions();

  let raw: unknown;
  try {
    raw = await WifiManager.reScanAndLoadWifiList();
  } catch (e) {
    console.warn('[WiFi] reScanAndLoadWifiList failed, trying loadWifiList():', e);
    try {
      // @ts-ignore optional on some versions
      raw = await WifiManager.loadWifiList?.();
    } catch (e2) {
      console.error('[WiFi] loadWifiList failed:', e2);
      return [];
    }
  }

  const arr = coerceToArray(raw);
  try {
    const mapped = arr
      .map((n: any) => ({
        ssid: n?.SSID ?? n?.ssid ?? '',
        bssid: n?.BSSID ?? n?.bssid,
        capabilities: n?.capabilities,
        level: typeof n?.level === 'number' ? n.level : undefined,
      }))
      .filter(n => !!n.ssid);
    return Array.isArray(mapped) ? mapped : [];
  } catch (e) {
    console.error('[WiFi] map/filter failed:', e, 'raw:', raw);
    return [];
  }
}


export async function waitForSsid(ssid: string, timeoutMs = 15000, intervalMs = 500) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const current = await WifiManager.getCurrentWifiSSID();
      if (current && current.replace(/"/g, '') === ssid) return true;
    } catch {}
    await new Promise(res => setTimeout(res, intervalMs));
  }
  return false;
}

export async function connectToNetwork(
  ssid: string,
  password?: string,
  capabilities?: string,
  isHidden: boolean = false
): Promise<void> {
  const secure = isSecureCaps(capabilities);
  const isWep = /(WEP)/i.test(capabilities || '');

  // Ensure we use the specifier-based API on Android 10+
  const hasSpecifier = typeof (WifiManager as any).connectToProtectedSSID === 'function';
  if (!hasSpecifier) {
    throw new Error('connectToProtectedSSID not available. Update react-native-wifi-reborn and rebuild the dev client.');
  }

  console.log('[WiFi] Connecting (specifier):', { ssid, secure, isWep, isHidden });

  await WifiManager.connectToProtectedSSID(
    ssid,
    secure ? String(password ?? '') : '',
    secure ? isWep : false,
    isHidden
  );

  // Wait until OS finishes the ephemeral connection
  const ok = await waitForSsid(ssid, 20000, 700);
  if (!ok) throw new Error('Failed to confirm Wi‑Fi connection (timeout).');
}


export function isSecure(capabilities?: string) { return isSecureCaps(capabilities); }