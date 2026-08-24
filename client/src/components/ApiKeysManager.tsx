import React, { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  rate_limit: number;
  is_active: number;
  created_at: string;
  last_used_at: string | null;
}

interface ApiKeysManagerProps {
  apiKeys: ApiKey[];
  onCreateKey: (name: string) => Promise<{ success: boolean; apiKey?: any; message?: string }>;
  onToggleKey: (id: string, isActive: boolean) => Promise<boolean>;
  onDeleteKey: (id: string) => Promise<boolean>;
}

const ApiKeysManager: React.FC<ApiKeysManagerProps> = ({ apiKeys, onCreateKey, onToggleKey, onDeleteKey }) => {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setIsSubmitting(true);
    const result = await onCreateKey(newKeyName.trim());
    if (result.success && result.apiKey) {
      setCreatedKey(result.apiKey.key);
      setShowKeyModal(true);
      setNewKeyName('');
      setShowForm(false);
    }
    setIsSubmitting(false);
  };

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    setTogglingId(id);
    await onToggleKey(id, !currentActive);
    setTogglingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;
    setDeletingId(id);
    await onDeleteKey(id);
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold dark:text-white">API Keys</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create API keys for third-party applications to send WhatsApp notifications
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          + Create Key
        </Button>
      </div>

      {showForm && (
        <Card className="p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium dark:text-gray-200">Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., ERP Integration, CRM Bot"
                className="w-full p-2 mt-1 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} loading={isSubmitting}>
              Create
            </Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); setNewKeyName(''); }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {showKeyModal && createdKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-lg w-full mx-4">
            <h3 className="text-lg font-bold dark:text-white mb-3">API Key Created</h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              Make sure to copy your API key now. You won't be able to see it again!
            </p>
            <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded font-mono text-sm break-all dark:text-white">
              {createdKey}
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
              <Button variant="secondary" onClick={() => { setShowKeyModal(false); setCreatedKey(null); }}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {apiKeys.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No API keys created yet. Create one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {apiKeys.map(key => (
            <Card key={key.id} className="p-4 flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium dark:text-white">{key.name}</span>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                    {key.key_prefix}••••••••
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${key.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400'}`}>
                    {key.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Created: {new Date(key.created_at).toLocaleDateString()}
                  {key.last_used_at && ` · Last used: ${new Date(key.last_used_at).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleToggle(key.id, !!key.is_active)}
                  loading={togglingId === key.id}
                >
                  {key.is_active ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDelete(key.id)}
                  loading={deletingId === key.id}
                >
                  Revoke
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiKeysManager;