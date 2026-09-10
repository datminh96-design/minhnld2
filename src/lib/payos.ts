import { PayOS } from '@payos/node';

export interface PayOSConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  isConfigured: boolean;
}

// In-memory or env configuration with the user-provided keys as defaults
export let PAYOS_CONFIG = {
  clientId: process.env.PAYOS_CLIENT_ID || '23a0f8b7-488b-4e8f-ade7-470dd0d51027',
  apiKey: process.env.PAYOS_API_KEY || '9ca106c4-8a7f-4a99-952f-8116f70c42b3',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'f706c2a141c70c8d497611cd7962f4524ef639ec812118d27527766bae9d12e7',
};

let payosInstance: PayOS | null = null;

export function getPayOSInstance(): PayOS {
  if (!PAYOS_CONFIG.clientId || !PAYOS_CONFIG.apiKey || !PAYOS_CONFIG.checksumKey) {
    throw new Error('Chưa cấu hình đầy đủ Client ID, API Key hoặc Checksum Key cho PayOS.');
  }

  if (!payosInstance) {
    payosInstance = new PayOS({
      clientId: PAYOS_CONFIG.clientId,
      apiKey: PAYOS_CONFIG.apiKey,
      checksumKey: PAYOS_CONFIG.checksumKey,
    });
  }
  return payosInstance;
}

export function updatePayOSConfig(config: { clientId?: string; apiKey?: string; checksumKey?: string }) {
  if (config.clientId) PAYOS_CONFIG.clientId = config.clientId.trim();
  if (config.apiKey) PAYOS_CONFIG.apiKey = config.apiKey.trim();
  if (config.checksumKey) PAYOS_CONFIG.checksumKey = config.checksumKey.trim();
  // Reset instance to re-initialize with new keys
  payosInstance = null;
}

export function getPayOSStatus(): PayOSConfig {
  return {
    clientId: PAYOS_CONFIG.clientId ? `${PAYOS_CONFIG.clientId.substring(0, 8)}...` : '',
    apiKey: PAYOS_CONFIG.apiKey ? `${PAYOS_CONFIG.apiKey.substring(0, 6)}...` : '',
    checksumKey: PAYOS_CONFIG.checksumKey ? `${PAYOS_CONFIG.checksumKey.substring(0, 8)}...` : '',
    isConfigured: Boolean(PAYOS_CONFIG.clientId && PAYOS_CONFIG.apiKey && PAYOS_CONFIG.checksumKey),
  };
}

/**
 * Clean & truncate description to meet PayOS requirement (max 25 characters, alphanumeric & spaces)
 */
export function formatPayOSDescription(desc?: string, fallbackOrderCode?: number | string): string {
  if (!desc) {
    return `Gui Dat Minh ${fallbackOrderCode || ''}`.trim().substring(0, 25);
  }
  // Remove Vietnamese diacritics for maximum compatibility with banking networks
  let nonAccent = desc
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();

  // If user passed full sentence "Gui tien cho Nguyen Le Dat Minh", compact to "Gui Nguyen Le Dat Minh" (22 chars)
  if (/gui\s+tien\s+cho\s+nguyen\s+le\s+dat\s+minh/i.test(nonAccent)) {
    return 'Gui Nguyen Le Dat Minh';
  }
  
  return (nonAccent || `DH${fallbackOrderCode || '123'}`).substring(0, 25);
}
