import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/layout/Layout';
import Toast from './components/ui/Toast';

import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Contacts from './pages/Contacts';
import Groups from './pages/Groups';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Setup from './pages/Setup';
import LicenseInput from './pages/LicenseInput';
import Help from './pages/Help';
import FAQ from './pages/FAQ';

import { useAppContext } from './context/AppContext';
import { licenseService } from './services/license';

const App: React.FC = () => {

  const { isAuthenticated, toast, setToast } = useAppContext();
  const [isLicenseReady, setIsLicenseReady] = useState<boolean | null>(null);
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  const [isAdminSetup, setIsAdminSetup] = useState<boolean | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // Check if admin exists on startup
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/auth/check');
        const data = await res.json();
        setIsAdminSetup(data.exists);
      } catch (err) {
        console.error('Failed to check admin:', err);
        setIsAdminSetup(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  // Check license status after admin setup
  useEffect(() => {
    if (!isAdminSetup || isCheckingAdmin) return;

    const checkLicense = async () => {
      try {
        const status = await licenseService.checkLicenseStatus();
        setIsLicenseReady(status.activated);
      } catch (err) {
        console.error('Failed to check license:', err);
        const localInfo = licenseService.getLicenseInfo();
        setIsLicenseReady(localInfo?.activated || false);
      } finally {
        setIsCheckingLicense(false);
      }
    };
    checkLicense();
  }, [isAdminSetup, isCheckingAdmin]);

  const handleLicenseActivated = () => {
    setIsLicenseReady(true);
    window.location.reload();
  };

  // Apply dark mode by default
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  if (isCheckingAdmin || isCheckingLicense) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAdminSetup) {
    return (
      <Router>
        <Routes>
          <Route path="/setup" element={<Setup />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
      </Router>
    );
  }

  if (isLicenseReady === false) {
    return (
      <>
        <LicenseInput onActivated={handleLicenseActivated} />
      </>
    );
  }

  return (
    <Router>
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <Routes>

        {/* ================= PUBLIC ROUTE ================= */}
        <Route path="/login" element={<Login />} />

        {/* ================= PROTECTED ROUTES ================= */}
        {isAuthenticated ? (
          <Route element={<Layout />}>

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Main Pages */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="/faq" element={<FAQ />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />

          </Route>
        ) : (
          /* If not logged in → redirect everything to login */
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}

      </Routes>
    </Router>
  );
};

export default App;
