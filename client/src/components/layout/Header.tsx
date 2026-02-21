
import React from 'react';
import { useLocation } from 'react-router-dom';

const Header: React.FC = () => {
    const location = useLocation();
    const getTitle = () => {
        const path = location.pathname.replace('/', '');
        if (!path) return 'Dashboard';
        return path.charAt(0).toUpperCase() + path.slice(1);
    };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-800">{getTitle()}</h1>
      </div>
    </header>
  );
};

export default Header;
