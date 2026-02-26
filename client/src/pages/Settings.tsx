import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useAppContext } from '../context/AppContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { UploadIcon, RefreshIcon, TrashIcon } from '../components/icons/Icons';
import { APP_VERSION } from '../version';

interface ServerVersion {
  appVersion: string;
  apiVersion: string;
  environment: string;
  timestamp: string;
}

interface License {
  license_key: string;
  customer_email: string;
  customer_name: string;
  purchase_date: string;
  activated: number;
  activation_date: string;
  is_active: number;
  created_at: string;
}

const Settings: React.FC = () => {

  const {
    settings,
    updateSettings,
    isWhatsAppConnected,
    qrCode,
    whatsAppStatus,
    connectWhatsApp,
    disconnectWhatsApp,
    resetWhatsApp,
    logout,
    handleExport,
    handleImport
  } = useAppContext();

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [localSettings, setLocalSettings] = useState(settings);

  const backupFileRef = useRef<HTMLInputElement>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [serverVersion, setServerVersion] = useState<ServerVersion | null>(null);

  // License management state
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoadingLicenses, setIsLoadingLicenses] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newLicenseEmail, setNewLicenseEmail] = useState('');
  const [newLicenseName, setNewLicenseName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(setServerVersion)
      .catch(console.error);
  }, []);

  // License management functions
  const fetchLicenses = async () => {
    const token = localStorage.getItem('token');
    setIsLoadingLicenses(true);
    try {
      const res = await fetch('/api/license/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLicenses(data.licenses);
      }
    } catch (err) {
      console.error('Failed to fetch licenses:', err);
    }
    setIsLoadingLicenses(false);
  };

  const generateLicense = async () => {
    if (!newLicenseEmail) {
      alert('Please enter customer email');
      return;
    }
    const token = localStorage.getItem('token');
    setIsGenerating(true);
    try {
      const res = await fetch('/api/license/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customerEmail: newLicenseEmail,
          customerName: newLicenseName
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`License generated: ${data.licenseKey}\n\nCustomer: ${data.customerEmail}`);
        setShowGenerateModal(false);
        setNewLicenseEmail('');
        setNewLicenseName('');
        fetchLicenses();
      } else {
        alert('Failed to generate license');
      }
    } catch (err) {
      console.error('Failed to generate license:', err);
      alert('Failed to generate license');
    }
    setIsGenerating(false);
  };

  const revokeLicense = async (key: string) => {
    if (!confirm(`Are you sure you want to revoke license: ${key}?`)) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/license/revoke/${key}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('License revoked successfully');
        fetchLicenses();
      } else {
        alert('Failed to revoke license');
      }
    } catch (err) {
      console.error('Failed to revoke license:', err);
      alert('Failed to revoke license');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('License key copied to clipboard!');
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  useEffect(() => {
    if (whatsAppStatus === 'SCAN_QR' && qrCode) {
      QRCode.toDataURL(qrCode, { width: 256, margin: 1 })
        .then(setQrCodeDataUrl)
        .catch(() => setQrCodeDataUrl(''));
    } else {
      setQrCodeDataUrl('');
    }
  }, [qrCode, whatsAppStatus]);

  const handleChangePassword = async () => {

    const token = localStorage.getItem('token');

    setIsChangingPassword(true);
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        oldPassword,
        newPassword
      })
    });

    const data = await res.json();

    if (data.success) {
      alert('Password updated successfully');
      setOldPassword('');
      setNewPassword('');
    } else {
      alert(data.message || 'Failed to update password');
    }
    setIsChangingPassword(false);
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setLocalSettings({ ...localSettings, messagesPerHour: value });
    }
  };

  const handleSettingsSave = async () => {
    setIsSavingSettings(true);
    const success = await updateSettings(localSettings);
    alert(success ? 'Settings saved' : 'Failed to save settings');
    setIsSavingSettings(false);
  };

  const onImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (window.confirm('This will overwrite all data. Continue?')) {
      await handleImport(file);
    }

    if (backupFileRef.current) backupFileRef.current.value = "";
  };

  const getStatus = () => {
    switch (whatsAppStatus) {
      case 'CONNECTED': return 'Connected';
      case 'CONNECTING': return 'Connecting...';
      case 'DISCONNECTED': return 'Disconnected';
      case 'FAILED': return 'Failed';
      case 'SCAN_QR': return 'Scan QR';
      default: return 'Unknown';
    }
  };

  const statusColor = isWhatsAppConnected
    ? 'bg-green-500'
    : whatsAppStatus === 'FAILED'
      ? 'bg-red-500'
      : 'bg-gray-400';

  return (
    <div className="p-6 bg-gray-50 dark:bg-slate-900 min-h-screen space-y-6 max-w-3xl mx-auto">

      {/* HEADER */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold dark:text-white">Settings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage application configuration
            </p>
          </div>

          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </Card>

      {/* BACKUP */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold dark:text-white">Backup & Restore</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Export or import your application data
          </p>

          <div className="flex gap-3">
            <Button onClick={handleExport}>
              Export Data
            </Button>

            <Button
              variant="secondary"
              icon={<UploadIcon className="w-4 h-4" />}
              onClick={() => backupFileRef.current?.click()}
            >
              Import Data
            </Button>

            <input
              type="file"
              ref={backupFileRef}
              onChange={onImport}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>
      </Card>

      {/* WHATSAPP */}
      <Card>
        <div className="space-y-5">

          <h3 className="text-lg font-semibold dark:text-white">WhatsApp Connection</h3>

          {/* STATUS */}
          <div className="flex justify-between items-center p-4 border rounded-lg bg-gray-50 dark:bg-slate-700 dark:border-slate-600">

            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${statusColor}`}></span>

              <span className="text-sm font-medium dark:text-white">
                Status: <b>{getStatus()}</b>
              </span>
            </div>

            <div className="flex gap-2">

              {isWhatsAppConnected ? (
                <Button variant="danger" onClick={disconnectWhatsApp}>
                  Disconnect
                </Button>
              ) : (
                <>
                  <Button
                    onClick={connectWhatsApp}
                    disabled={whatsAppStatus === 'CONNECTING' || whatsAppStatus === 'SCAN_QR'}
                  >
                    Connect
                  </Button>

                  {(whatsAppStatus === 'FAILED' || whatsAppStatus === 'DISCONNECTED') && (
                    <Button variant="secondary" onClick={resetWhatsApp}>
                      Reset
                    </Button>
                  )}
                </>
              )}

            </div>
          </div>

          {/* QR */}
          {whatsAppStatus === 'SCAN_QR' && (
            <div className="text-center border-t dark:border-slate-600 pt-6 space-y-3">

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Scan QR using WhatsApp on your phone
              </p>

              <div className="inline-block p-4 bg-white dark:bg-slate-700 rounded-lg shadow">
                {qrCodeDataUrl
                  ? <img src={qrCodeDataUrl} className="w-64 h-64" />
                  : <div className="w-64 h-64 bg-gray-200 dark:bg-slate-600 animate-pulse rounded" />
                }
              </div>

            </div>
          )}

          {/* ERROR */}
          {whatsAppStatus === 'FAILED' && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
              WhatsApp connection failed. Check server logs.
            </div>
          )}

        </div>
      </Card>

      {/* RATE */}
      <Card>
        <div className="space-y-5">

          <h3 className="text-lg font-semibold dark:text-white">Messaging Rate</h3>

          <div>
            <label className="text-sm font-medium dark:text-gray-200">
              Messages per Hour
            </label>

            <div className="flex items-center gap-4 mt-2">

              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={localSettings.messagesPerHour}
                onChange={handleRateChange}
                className="w-full"
              />

              <input
                type="number"
                value={localSettings.messagesPerHour}
                onChange={handleRateChange}
                className="w-20 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />

            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Recommended: 60–70 messages/hour
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSettingsSave} loading={isSavingSettings}>
              Save Settings
            </Button>
          </div>

        </div>
      </Card>

      {/* SECURITY */}
      <Card>
        <div className="pt-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Security
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Change your login password.
          </p>

          <div className="mt-4 space-y-3">

            <input
              type="password"
              placeholder="Current Password"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />

            <input
              type="password"
              placeholder="New Password"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <div className="flex justify-end">
              <Button onClick={handleChangePassword} loading={isChangingPassword}>
                Update Password
              </Button>
            </div>

          </div>
        </div>
      </Card>

      {/* VERSION INFO */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold dark:text-white">About & Version</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Application version information for support
          </p>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded">
              <span className="text-gray-500 dark:text-gray-400">Client Version</span>
              <p className="font-semibold dark:text-white">{APP_VERSION}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded">
              <span className="text-gray-500 dark:text-gray-400">Server Version</span>
              <p className="font-semibold dark:text-white">{serverVersion?.appVersion || 'Loading...'}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded">
              <span className="text-gray-500 dark:text-gray-400">API Version</span>
              <p className="font-semibold dark:text-white">{serverVersion?.apiVersion || 'Loading...'}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded">
              <span className="text-gray-500 dark:text-gray-400">Environment</span>
              <p className="font-semibold dark:text-white">{serverVersion?.environment || 'Loading...'}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* LICENSE MANAGEMENT */}
      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold dark:text-white">License Management</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Generate and manage customer license keys
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                icon={<RefreshIcon className="w-4 h-4" />}
                onClick={fetchLicenses}
                disabled={isLoadingLicenses}
              >
                Refresh
              </Button>
              <Button 
                onClick={() => setShowGenerateModal(true)}
              >
                Generate Key
              </Button>
            </div>
          </div>

          {/* LICENSE LIST */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-2 text-left dark:text-gray-300">License Key</th>
                  <th className="px-4 py-2 text-left dark:text-gray-300">Customer</th>
                  <th className="px-4 py-2 text-left dark:text-gray-300">Status</th>
                  <th className="px-4 py-2 text-left dark:text-gray-300">Activated</th>
                  <th className="px-4 py-2 text-left dark:text-gray-300">Created</th>
                  <th className="px-4 py-2 text-right dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingLicenses ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : licenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No licenses found. Click "Generate Key" to create one.
                    </td>
                  </tr>
                ) : (
                  licenses.map((license) => (
                    <tr key={license.license_key} className="border-t dark:border-slate-600">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                            {license.license_key}
                          </code>
                          <button
                            onClick={() => copyToClipboard(license.license_key)}
                            className="text-blue-500 hover:text-blue-600 text-xs"
                          >
                            Copy
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 dark:text-gray-300">
                        <div>{license.customer_name || '-'}</div>
                        <div className="text-xs text-gray-500">{license.customer_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {license.is_active ? (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs">
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 dark:text-gray-300">
                        {license.activated ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(license.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {license.is_active && (
                          <button
                            onClick={() => revokeLicense(license.license_key)}
                            className="text-red-500 hover:text-red-600 text-xs flex items-center gap-1 ml-auto"
                          >
                            <TrashIcon className="w-3 h-3" />
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* GENERATE LICENSE MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold dark:text-white mb-4">Generate License Key</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                  Customer Email *
                </label>
                <input
                  type="email"
                  value={newLicenseEmail}
                  onChange={(e) => setNewLicenseEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium dark:text-gray-300 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={newLicenseName}
                  onChange={(e) => setNewLicenseName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowGenerateModal(false);
                  setNewLicenseEmail('');
                  setNewLicenseName('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={generateLicense}
                loading={isGenerating}
                disabled={!newLicenseEmail}
              >
                Generate
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
