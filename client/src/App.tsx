import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/layout/Layout';
import Toast from './components/ui/Toast';

import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Contacts from './pages/Contacts';
import Groups from './pages/Groups';
import Settings from './pages/Settings';
import Login from './pages/Login';

import { useAppContext } from './context/AppContext';

const App: React.FC = () => {

  const { isAuthenticated, toast, setToast } = useAppContext();

  // Apply dark mode by default
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

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
