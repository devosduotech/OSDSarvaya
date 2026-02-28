import React, { useState } from 'react';
import { licenseService } from '../services/license';
import { getVersion } from '../version';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface LicenseInputProps {
  onActivated: () => void;
}

const LicenseInput: React.FC<LicenseInputProps> = ({ onActivated }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatLicenseKey = (value: string): string => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 4) return cleaned;
    const prefix = cleaned.substring(0, 4);
    const rest = cleaned.substring(4, 20);
    const parts = [];
    for (let i = 0; i < rest.length; i += 4) {
      parts.push(rest.substring(i, i + 4));
    }
    return parts.length > 0 ? `${prefix}-${parts.join('-')}` : prefix;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLicenseKey(e.target.value);
    setLicenseKey(formatted);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!licenseKey || licenseKey.length !== 19) {
      setError('Please enter a valid license key');
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await licenseService.activateLicense(licenseKey, email);
      
      if (result.success) {
        setSuccess(`License activated! Welcome${result.customerName ? `, ${result.customerName}` : ''}!`);
        setTimeout(() => {
          onActivated();
        }, 1500);
      } else {
        setError(result.message || 'Activation failed. Please check your license key.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
            OSDSarvaya
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            WhatsApp Bulk Messaging Application
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Version {getVersion()}
          </p>
        </div>

        <Card>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold dark:text-white">License Activation</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Enter your license key to activate OSDSarvaya
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                License Key
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={handleChange}
                placeholder="OSDS-XXXX-XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white text-center text-lg tracking-widest font-mono"
                maxLength={19}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Format: OSDS-XXXX-XXXX-XXXX-XXXX
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white text-center"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Enter the email associated with your license
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading || licenseKey.length !== 19 || !email}
            >
              {isLoading ? 'Activating...' : 'Activate License'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-600">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Need help? Contact our support team.
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          &copy; {new Date().getFullYear()} OSDuo Tech. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LicenseInput;
