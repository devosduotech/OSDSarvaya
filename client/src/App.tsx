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
import LicenseInput from './pages/LicenseInput';

import { useAppContext } from './context/AppContext';

const App: React.FC = () => {

  const { isAuthenticated, toast, setToast } = useAppContext();
  const [isLicenseReady, setIsLicenseReady] = useState(true); // Temporarily disabled
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);

  useEffect(() => {
    // License check disabled for testing
    // const checkLicense = async () => {
    //   const isActivated = licenseService.isLicenseActivated();
    //   if (isActivated) {
    //     const validation = await licenseService.validateLicense();
    //     if (validation.success && validation.valid && validation.activated) {
    //       setIsLicenseReady(true);
    //     } else {
    //       licenseService.clearLicenseInfo();
    //       setIsLicenseReady(false);
    //     }
    //   } else {
    //     setIsLicenseReady(false);
    //   }
    //   setIsCheckingLicense(false);
    // };
    // checkLicense();
    setIsCheckingLicense(false);
  }, []);

  const handleLicenseActivated = () => {
    setIsLicenseReady(true);
    window.location.reload();
  };

  // Apply dark mode by default
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  if (isCheckingLicense) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isLicenseReady) {
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
