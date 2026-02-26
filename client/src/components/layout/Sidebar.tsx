import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../../assets/Logo.png';
import { getVersion } from '../../version';
import {
  DashboardIcon,
  CampaignsIcon,
  ContactsIcon,
  GroupsIcon,
  SettingsIcon
} from '../icons/Icons';

const Sidebar: React.FC = () => {

  const navigate = useNavigate();

  // Navigation styles
  const navLinkClasses =
    "flex items-center px-4 py-3 rounded-lg transition-colors duration-200 text-gray-300 hover:bg-blue-600 hover:text-white";

  const activeLinkClasses =
    "bg-blue-600 text-white font-semibold";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-800 text-white">

      {/* ===== Branding Section ===== */}
      <div className="px-6 py-6 border-b border-slate-700 text-center">

        {/* Logo */}
        <img
          src={logo}
          alt="OSDuo Tech"
          className="h-10 w-auto mx-auto mb-3 cursor-pointer bg-white p-1 rounded"
          onClick={() => navigate('/dashboard')}
        />

        {/* App Name */}
        <h1
          onClick={() => navigate('/dashboard')}
          className="text-lg font-semibold tracking-wide cursor-pointer"
        >
          OSDSarvaya
        </h1>

        {/* Branding */}
        <a
          href="mailto:info@osduotech.com"
          className="block text-xs text-gray-400 hover:text-white mt-1"
        >
          by OSDuo Tech
        </a>

      </div>

      {/* ===== Navigation ===== */}
      <nav className="flex-1 px-3 py-4 space-y-2">

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`
          }
        >
          <DashboardIcon className="h-5 w-5 mr-3" />
          Dashboard
        </NavLink>

        <NavLink
          to="/campaigns"
          className={({ isActive }) =>
            `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`
          }
        >
          <CampaignsIcon className="h-5 w-5 mr-3" />
          Campaigns
        </NavLink>

        <NavLink
          to="/contacts"
          className={({ isActive }) =>
            `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`
          }
        >
          <ContactsIcon className="h-5 w-5 mr-3" />
          Contacts
        </NavLink>

        <NavLink
          to="/groups"
          className={({ isActive }) =>
            `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`
          }
        >
          <GroupsIcon className="h-5 w-5 mr-3" />
          Groups
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `${navLinkClasses} ${isActive ? activeLinkClasses : ''}`
          }
        >
          <SettingsIcon className="h-5 w-5 mr-3" />
          Settings
        </NavLink>

      </nav>

      {/* ===== Footer ===== */}
      <div className="px-6 py-4 border-t border-slate-700 text-center space-y-1">

        {/* Version */}
        <div className="text-[11px] text-gray-500">
          {getVersion()}
        </div>

        {/* Copyright */}
        <a
          href="mailto:info@osduotech.com"
          className="text-xs text-gray-400 hover:text-white"
        >
          © {new Date().getFullYear()} OSDuo Tech
        </a>

      </div>

    </aside>
  );
};

export default Sidebar;
