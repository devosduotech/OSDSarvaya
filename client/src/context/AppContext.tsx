import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useEffect
} from 'react';

import useLocalStorage from '../hooks/useLocalStorage';
import {
  Contact,
  Group,
  CampaignTemplate,
  CampaignRun,
  CampaignReport
} from '../types';

import io, { Socket } from 'socket.io-client';

export type WhatsAppStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'SCAN_QR'
  | 'CONNECTED'
  | 'FAILED';

interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

interface AppContextType {
  contacts: Contact[];
  groups: Group[];
  campaignTemplates: CampaignTemplate[];
  campaignRuns: CampaignRun[];
  reports: CampaignReport[];
  activities: Activity[];
  settings: { messagesPerHour: number };

  addContact: (contact: Omit<Contact, 'id'>) => Promise<{ success: boolean; data?: Contact; error?: string }>;
  updateContact: (contact: Contact) => Promise<{ success: boolean; data?: Contact; error?: string }>;
  deleteContact: (id: string) => Promise<boolean>;
  toggleContactOptStatus: (id: string, optedIn: boolean) => Promise<boolean>;
  addContactsBulk: (contacts: Omit<Contact, 'id'>[]) => Promise<boolean>;

  addGroup: (group: { name: string; contactIds: string[] }) => Promise<Group | null>;
  updateGroup: (group: Group) => Promise<Group | null>;
  deleteGroup: (id: string) => Promise<boolean>;

  addTemplate: (template: Omit<CampaignTemplate, 'id' | 'createdAt'>) => Promise<CampaignTemplate | null>;
  updateTemplate: (template: CampaignTemplate) => Promise<CampaignTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;

  updateSettings: (settings: { messagesPerHour: number }) => Promise<boolean>;

  isLoading: boolean;
  appError: string | null;

  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;

  startCampaignRun: (templateId: string, groupIds: string[]) => Promise<boolean>;
  stopCampaignRun: () => Promise<boolean>;
  scheduleCampaign: (templateId: string, groupIds: string[], scheduledAt: string) => Promise<{ success: boolean; runId: string } | null>;
  cancelQueuedCampaign: (runId: string) => Promise<boolean>;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  toast: { message: string; type: 'success' | 'error' | 'warning' | 'info' } | null;
  setToast: React.Dispatch<React.SetStateAction<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>>;

  isWhatsAppConnected: boolean;
  qrCode: string;
  whatsAppStatus: WhatsAppStatus;
  connectWhatsApp: () => void;
  disconnectWhatsApp: () => void;
  resetWhatsApp: () => void;
  isCampaignRunning: boolean;

  handleExport: () => void;
  handleImport: (file: File) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const BACKEND_URL = '';

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

  // =========================
  // STATE
  // =========================
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [campaignTemplates, setCampaignTemplates] = useState<CampaignTemplate[]>([]);
  const [campaignRuns, setCampaignRuns] = useState<CampaignRun[]>([]);
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [settings, setSettings] = useState({ messagesPerHour: 65 });

  const [token, setToken] = useLocalStorage<string | null>('osdsarvaya_token', null);
  const isAuthenticated = !!token;

  const [isLoading, setIsLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const [qrCode, setQrCode] = useState('');
  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsAppStatus>('DISCONNECTED');
  const [isCampaignRunning, setCampaignRunning] = useState(false);

  const isWhatsAppConnected = whatsAppStatus === 'CONNECTED';

  const socketRef = useRef<Socket | null>(null);

  // =========================
  // API
  // =========================
  const apiRequest = async <T,>(endpoint: string, method: string, body?: any): Promise<T> => {
    setAppError(null);

    const response = await fetch(`${BACKEND_URL}/api${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'API error');
    }

    if (response.status === 204) return null as T;

    return response.json();
  };

  // =========================
  // FETCH DATA
  // =========================
  const fetchData = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);

    try {
      const data = await apiRequest<{
        contacts: Contact[];
        groups: Group[];
        campaignTemplates: CampaignTemplate[];
        campaignRuns: CampaignRun[];
        reports: CampaignReport[];
        settings: { messagesPerHour: number };
        activities?: Activity[];
      }>('/data', 'GET');

      setContacts(data.contacts);
      setGroups(data.groups);
      setCampaignTemplates(data.campaignTemplates);
      setCampaignRuns(data.campaignRuns);
      setReports(data.reports);
      setSettings(data.settings);
      
      if (data.activities) {
        setActivities(data.activities);
      }

      // Fetch version from server (for display only, actual version from package.json)
      try {
        const versionRes = await fetch('/api/version');
        const versionData = await versionRes.json();
        console.log('Server version:', versionData.appVersion);
      } catch (e) {
        console.error('Failed to fetch version:', e);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // SOCKET (FIXED)
  // =========================
  useEffect(() => {

    if (!isAuthenticated) return;

    fetchData();

    const socket = io({
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
      reconnection: true
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket error:', err.message);
    });

    socket.on('qr_code', qr => {
      setQrCode(qr);
      setWhatsAppStatus('SCAN_QR');
    });

    socket.on('status_change', status => {
      setWhatsAppStatus(status);
      if (status === 'CONNECTED') setQrCode('');
    });

    socket.on('campaign_status_change', ({ isRunning, runId, status }) => {
      setCampaignRunning(isRunning);

      if (runId && status) {
        setCampaignRuns(prev =>
          prev.map(run =>
            run.id === runId ? { ...run, status } : run
          )
        );
      }
    });

    socket.on('campaign_progress', data => {
      setReports(prev =>
        prev.map(r =>
          r.campaignRunId === data.runId
            ? { ...r, ...data }
            : r
        )
      );
    });

    socket.on('activity', (activity: Activity) => {
      setActivities(prev => [activity, ...prev].slice(0, 50));
    });

    socket.on('disconnect', () => {
      setWhatsAppStatus('DISCONNECTED');
    });

    return () => {
      socket.disconnect();
    };

  }, [isAuthenticated, token]);

  // =========================
  // AUTH
  // =========================
  const login = (newToken: string) => setToken(newToken);

  const logout = () => {
    setToken(null);
    socketRef.current?.disconnect();
  };

  // =========================
  // CRUD (UNCHANGED)
  // =========================
  const addContact = async (contact: Omit<Contact, 'id'>) => {
    const newContact = { ...contact, id: `contact_${Date.now()}` };
    try {
      const res = await apiRequest<Contact>('/contacts', 'POST', newContact);
      setContacts(c => [res, ...c]);
      return { success: true, data: res };
    } catch (err: any) {
      const message = err.message || 'Failed to create contact';
      return { success: false, error: message };
    }
  };

  const updateContact = async (contact: Contact) => {
    try {
      const res = await apiRequest<Contact>(`/contacts/${contact.id}`, 'PUT', contact);
      setContacts(c => c.map(x => x.id === res.id ? res : x));
      return { success: true, data: res };
    } catch (err: any) {
      const message = err.message || 'Failed to update contact';
      return { success: false, error: message };
    }
  };

  const deleteContact = async (id: string) => {
    try {
      await apiRequest(`/contacts/${id}`, 'DELETE');
      setContacts(c => c.filter(x => x.id !== id));
      return true;
    } catch {
      return false;
    }
  };

  const toggleContactOptStatus = async (id: string, optedIn: boolean) => {
    try {
      const res = await apiRequest<Contact>(`/contacts/${id}/opt-status`, 'PUT', { optedIn });
      if (res && res.id) {
        setContacts(c => c.map(x => x.id === res.id ? res : x));
        return true;
      }
      await fetchData();
      return true;
    } catch {
      return false;
    }
  };

  const addContactsBulk = async (contacts: Omit<Contact, 'id'>[]) => {
    const newContacts = contacts.map((c, i) => ({
      ...c,
      id: `contact_${Date.now()}_${i}`
    }));

    try {
      await apiRequest('/contacts/bulk', 'POST', newContacts);
      await fetchData();
      return true;
    } catch {
      return false;
    }
  };

  const addGroup = async (group: { name: string; contactIds: string[] }) => {
    const newGroup = { ...group, id: `group_${Date.now()}` };
    try {
      const res = await apiRequest<Group>('/groups', 'POST', newGroup);
      setGroups(g => [res, ...g]);
      return res;
    } catch {
      return null;
    }
  };

  const updateGroup = async (group: Group) => {
    try {
      const res = await apiRequest<Group>(`/groups/${group.id}`, 'PUT', group);
      setGroups(g => g.map(x => x.id === res.id ? res : x));
      return res;
    } catch {
      return null;
    }
  };

  const deleteGroup = async (id: string) => {
    try {
      await apiRequest(`/groups/${id}`, 'DELETE');
      setGroups(g => g.filter(x => x.id !== id));
      return true;
    } catch {
      return false;
    }
  };

  const addTemplate = async (template: Omit<CampaignTemplate, 'id' | 'createdAt'>) => {
    const newTpl = {
      ...template,
      id: `camp_${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await apiRequest<CampaignTemplate>('/templates', 'POST', newTpl);
      setCampaignTemplates(t => [res, ...t]);
      return res;
    } catch {
      return null;
    }
  };

  const updateTemplate = async (template: CampaignTemplate) => {
    try {
      const res = await apiRequest<CampaignTemplate>(`/templates/${template.id}`, 'PUT', template);
      setCampaignTemplates(t => t.map(x => x.id === res.id ? res : x));
      return res;
    } catch {
      return null;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await apiRequest(`/templates/${id}`, 'DELETE');
      setCampaignTemplates(t => t.filter(x => x.id !== id));
      return true;
    } catch {
      return false;
    }
  };

  const updateSettings = async (newSettings: { messagesPerHour: number }) => {
    try {
      await apiRequest('/settings', 'PUT', newSettings);
      setSettings(newSettings);
      return true;
    } catch {
      return false;
    }
  };

  // =========================
  // CAMPAIGN
  // =========================
  const startCampaignRun = async (templateId: string, groupIds: string[]) => {
    if (!isWhatsAppConnected || isCampaignRunning) return false;

    try {
      await apiRequest('/campaigns/start', 'POST', { templateId, groupIds });
      await fetchData();
      return true;
    } catch {
      return false;
    }
  };

  const stopCampaignRun = async () => {
    if (!isCampaignRunning) return false;

    try {
      await apiRequest('/campaigns/stop', 'POST');
      setCampaignRunning(false);
      await fetchData();
      return true;
    } catch {
      return false;
    }
  };

  const scheduleCampaign = async (templateId: string, groupIds: string[], scheduledAt: string) => {
    try {
      const result = await apiRequest<{ success: boolean; runId: string }>('/campaigns/schedule', 'POST', { 
        templateId, 
        groupIds, 
        scheduledAt 
      });
      await fetchData();
      return result;
    } catch {
      return null;
    }
  };

  const cancelQueuedCampaign = async (runId: string) => {
    try {
      await apiRequest(`/campaigns/cancel/${runId}`, 'POST');
      await fetchData();
      return true;
    } catch {
      return false;
    }
  };

  // =========================
  // BACKUP
  // =========================
  const handleExport = async () => {
    const response = await fetch(`${BACKEND_URL}/api/backup`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `backup.json`;
    a.click();
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    await apiRequest('/backup', 'POST', JSON.parse(text));
    await fetchData();
  };

  // =========================
  // BUTTON ACTIONS (FIXED)
  // =========================
  const connectWhatsApp = () => {
    console.log('CONNECT WA CLICKED');
    socketRef.current?.emit('connect_wa');
  };

  const disconnectWhatsApp = () => {
    console.log('DISCONNECT WA CLICKED');
    socketRef.current?.emit('disconnect_wa');
  };

  const resetWhatsApp = () => {
    console.log('RESET WA CLICKED');
    socketRef.current?.emit('reset_wa');
  };

  const value = {
    contacts,
    groups,
    campaignTemplates,
    campaignRuns,
    reports,
    activities,
    settings,
    isLoading,
    appError,

    addContact,
    updateContact,
    deleteContact,
    toggleContactOptStatus,
    addContactsBulk,
    addGroup,
    updateGroup,
    deleteGroup,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    updateSettings,

    isAuthenticated,
    login,
    logout,

    startCampaignRun,
    stopCampaignRun,
    scheduleCampaign,
    cancelQueuedCampaign,
    showToast,
    toast,
    setToast,
    isCampaignRunning,

    isWhatsAppConnected,
    qrCode,
    whatsAppStatus,
    connectWhatsApp,
    disconnectWhatsApp,
    resetWhatsApp,

    handleExport,
    handleImport
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppContextProvider');
  return context;
};
