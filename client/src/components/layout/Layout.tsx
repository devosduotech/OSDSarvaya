import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Outlet, useLocation } from 'react-router-dom';

const Layout: React.FC = () => {

  const location = useLocation();

  // ===== PAGE TITLE RESOLVER =====
  const getTitle = () => {
    const path = location.pathname;

    switch (true) {
      case path.startsWith('/campaigns'):
        return 'Campaigns';

      case path.startsWith('/contacts'):
        return 'Contacts';

      case path.startsWith('/groups'):
        return 'Groups';

      case path.startsWith('/settings'):
        return 'Settings';

      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 font-sans overflow-hidden">

      {/* ===== SIDEBAR ===== */}
      <Sidebar />

      {/* ===== MAIN LAYOUT ===== */}
      <div className="flex-1 flex flex-col">

        {/* ===== TOP NAVBAR ===== */}
        <Navbar title={getTitle()} />

        {/* ===== PAGE CONTENT ===== */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-900">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default Layout;
