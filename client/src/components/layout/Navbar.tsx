import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import Button from '../ui/Button';

interface NavbarProps {
  title: string;
}

const Navbar: React.FC<NavbarProps> = ({ title }) => {

  const {
    whatsAppStatus,
    isWhatsAppConnected,
    logout
  } = useAppContext();

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  const getStatusColor = () => {
    if (isWhatsAppConnected) return 'bg-green-500';
    if (whatsAppStatus === 'FAILED') return 'bg-red-500';
    if (whatsAppStatus === 'CONNECTING') return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    switch (whatsAppStatus) {
      case 'CONNECTED': return 'Connected';
      case 'CONNECTING': return 'Connecting';
      case 'SCAN_QR': return 'Scan QR';
      case 'FAILED': return 'Failed';
      default: return 'Disconnected';
    }
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">

      {/* LEFT */}
      <div>
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
          {title}
        </h1>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>

        {/* WhatsApp Status */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className={`h-2.5 w-2.5 rounded-full ${getStatusColor()}`} />
          {getStatusText()}
        </div>

        {/* Logout */}
        <Button variant="ghost" onClick={logout}>
          Logout
        </Button>

      </div>

    </header>
  );
};

export default Navbar;
