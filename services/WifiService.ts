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
  
  try {
    const Location = await getLocationModule();
    
    // Request permissions with retry logic
    let permissionStatus = 'undetermined';
    let attempts = 0;
    const maxAttempts = 3;
    
    while (permissionStatus !== 'granted' && attempts < maxAttempts) {
      attempts++;
      console.log(`[WiFi] Requesting location permissions (attempt ${attempts}/${maxAttempts})`);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      permissionStatus = status;
      
      if (status === 'granted') {
        console.log('[WiFi] Location permissions granted');
        break;
      } else if (attempts < maxAttempts) {
        console.log(`[WiFi] Permission denied, retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (permissionStatus !== 'granted') {
      throw new Error('Location permission is required to scan Wi‑Fi. Please enable it in Settings.');
    }
    
    // Check if location services are enabled
    const providers = await Location.getProviderStatusAsync();
    if (!providers.locationServicesEnabled) {
      throw new Error('Location service is turned off. Please enable Location Services in Settings.');
    }
    
    console.log('[WiFi] All permissions and services verified');
  } catch (error) {
    console.error('[WiFi] Permission check failed:', error);
    throw error;
  }
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
  
  try {
    await ensureWifiScanPermissions();
  } catch (error) {
    console.error('[WiFi] Permission check failed:', error);
    throw error;
  }

  let raw: unknown;
  let scanAttempts = 0;
  const maxScanAttempts = 3;
  
  // Retry scanning with exponential backoff
  while (scanAttempts < maxScanAttempts) {
    scanAttempts++;
    console.log(`[WiFi] Scanning attempt ${scanAttempts}/${maxScanAttempts}`);
    
    try {
      raw = await WifiManager.reScanAndLoadWifiList();
      console.log('[WiFi] reScanAndLoadWifiList successful');
      break;
    } catch (e) {
      console.warn(`[WiFi] reScanAndLoadWifiList failed (attempt ${scanAttempts}):`, e);
      
      if (scanAttempts < maxScanAttempts) {
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, scanAttempts) * 1000; // 2s, 4s, 8s
        console.log(`[WiFi] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Last attempt failed, try loadWifiList as fallback
        console.warn('[WiFi] All reScanAndLoadWifiList attempts failed, trying loadWifiList():', e);
        try {
          // @ts-ignore optional on some versions
          raw = await WifiManager.loadWifiList?.();
          console.log('[WiFi] loadWifiList fallback successful');
        } catch (e2) {
          console.error('[WiFi] loadWifiList fallback also failed:', e2);
          throw new Error('WiFi scanning failed. Please ensure Location Services are enabled and try again.');
        }
      }
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
    
    console.log(`[WiFi] Successfully scanned ${mapped.length} networks`);
    return Array.isArray(mapped) ? mapped : [];
  } catch (e) {
    console.error('[WiFi] map/filter failed:', e, 'raw:', raw);
    throw new Error('Failed to process WiFi scan results. Please try again.');
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