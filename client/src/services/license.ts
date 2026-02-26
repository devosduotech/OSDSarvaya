import { APP_VERSION } from '../version';

const API_BASE = '';

interface LicenseInfo {
  licenseKey: string;
  machineId: string;
  customerEmail?: string;
  customerName?: string;
  activated: boolean;
  activationDate?: string;
}

interface LicenseValidationResponse {
  success: boolean;
  valid?: boolean;
  activated?: boolean;
  customerEmail?: string;
  customerName?: string;
  activationDate?: string;
  message?: string;
}

interface UpdateInfo {
  success: boolean;
  currentVersion: string;
  updateAvailable: boolean;
  minVersionOk: boolean;
  update?: {
    version: string;
    downloadUrl: string;
    changelog: string;
    releaseDate: string;
    mandatory: boolean;
  };
}

function getMachineId(): string {
  const key = 'osdsarvaya_machine_id';
  
  let machineId = localStorage.getItem(key);
  
  if (!machineId) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    machineId = result.toUpperCase();
    localStorage.setItem(key, machineId);
  }
  
  return machineId;
}

function getLicenseInfo(): LicenseInfo | null {
  const key = 'osdsarvaya_license';
  const data = localStorage.getItem(key);
  
  if (!data) return null;
  
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function saveLicenseInfo(info: LicenseInfo): void {
  localStorage.setItem('osdsarvaya_license', JSON.stringify(info));
}

function clearLicenseInfo(): void {
  localStorage.removeItem('osdsarvaya_license');
}

async function activateLicense(licenseKey: string): Promise<{ licenseKey: string; success: boolean; message: string; customerEmail?: string; customerName?: string }> {
  const machineId = getMachineId();
  
  try {
    const response = await fetch(`${API_BASE}/api/license/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey: licenseKey.trim().toUpperCase(),
        machineId
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const licenseInfo: LicenseInfo = {
        licenseKey: licenseKey.trim().toUpperCase(),
        machineId,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        activated: true,
        activationDate: new Date().toISOString()
      };
      saveLicenseInfo(licenseInfo);
    }
    
    return {
      licenseKey: licenseKey.trim().toUpperCase(),
      success: data.success,
      message: data.message,
      customerEmail: data.customerEmail,
      customerName: data.customerName
    };
  } catch (err) {
    console.error('License activation error:', err);
    return {
      licenseKey: licenseKey.trim().toUpperCase(),
      success: false,
      message: 'Failed to connect to license server. Please check your internet connection.'
    };
  }
}

async function validateLicense(): Promise<LicenseValidationResponse> {
  const licenseInfo = getLicenseInfo();
  
  if (!licenseInfo) {
    return { success: false, valid: false, message: 'No license found' };
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/license/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey: licenseInfo.licenseKey,
        machineId: licenseInfo.machineId
      })
    });
    
    const data = await response.json();
    
    return data;
  } catch (err) {
    console.error('License validation error:', err);
    return { success: false, valid: false, message: 'Failed to validate license' };
  }
}

async function checkForUpdates(): Promise<UpdateInfo> {
  try {
    const response = await fetch(`${API_BASE}/api/updates/check?version=${APP_VERSION}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Update check error:', err);
    return {
      success: false,
      currentVersion: APP_VERSION,
      updateAvailable: false,
      minVersionOk: true
    };
  }
}

async function downloadUpdate(version: string): Promise<void> {
  const url = `${API_BASE}/api/updates/download/${version}`;
  window.open(url, '_blank');
}

function isLicenseActivated(): boolean {
  const info = getLicenseInfo();
  return info?.activated || false;
}

function getLicenseKey(): string | null {
  const info = getLicenseInfo();
  return info?.licenseKey || null;
}

export const licenseService = {
  getMachineId,
  getLicenseInfo,
  activateLicense,
  validateLicense,
  checkForUpdates,
  downloadUpdate,
  isLicenseActivated,
  getLicenseKey,
  clearLicenseInfo
};

export type { LicenseInfo, LicenseValidationResponse, UpdateInfo };
