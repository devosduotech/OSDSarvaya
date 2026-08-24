import React, { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: number;
  created_at: string;
}

interface WebhooksManagerProps {
  webhooks: Webhook[];
  availableEvents: string[];
  onCreateWebhook: (data: { name: string; url: string; events: string[] }) => Promise<{ success: boolean; webhook?: Webhook; message?: string }>;
  onUpdateWebhook: (id: string, data: Partial<Webhook>) => Promise<boolean>;
  onDeleteWebhook: (id: string) => Promise<boolean>;
  onTestWebhook: (id: string) => Promise<{ success: boolean; message: string }>;
}

const WebhooksManager: React.FC<WebhooksManagerProps> = ({
  webhooks,
  availableEvents,
  onCreateWebhook,
  onUpdateWebhook,
  onDeleteWebhook,
  onTestWebhook
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>(['message.sent', 'message.failed']);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; result: any } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    const result = await onCreateWebhook({ name: newName.trim(), url: newUrl.trim(), events: newEvents });
    if (result.success && result.webhook) {
      setCreatedSecret(result.webhook.secret);
      setShowSecretModal(true);
      setNewName('');
      setNewUrl('');
      setNewEvents(['message.sent', 'message.failed']);
    }
    setIsCreating(false);
  };

  const toggleEvent = (event: string) => {
    setNewEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    const result = await onTestWebhook(id);
    setTestResult({ id, result });
    setTestingId(null);
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    setTogglingId(id);
    await onUpdateWebhook(id, { isActive: !currentActive } as any);
    setTogglingId(null);
  };

  const eventLabels: Record<string, string> = {
    'message.sent': 'Message Sent',
    'message.failed': 'Message Failed',
    'campaign.started': 'Campaign Started',
    'campaign.completed': 'Campaign Completed',
    'campaign.stopped': 'Campaign Stopped',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold dark:text-white">Webhooks</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure webhook endpoints to receive event notifications
          </p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          + Add Webhook
        </Button>
      </div>

      {isCreating && (
        <Card className="p-4 space-y-3">
          <div>
            <label className="text-sm font-medium dark:text-gray-200">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., ERP callback"
              className="w-full p-2 mt-1 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium dark:text-gray-200">Callback URL</label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://your-erp.com/api/webhook"
              className="w-full p-2 mt-1 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium dark:text-gray-200 mb-2 block">Events</label>
            <div className="flex flex-wrap gap-2">
              {availableEvents.map(event => (
                <label key={event} className="flex items-center gap-1.5 text-sm dark:text-gray-200 bg-slate-50 dark:bg-slate-700 px-3 py-1.5 rounded">
                  <input
                    type="checkbox"
                    checked={newEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                  />
                  {eventLabels[event] || event}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} loading={isCreating}>Create Webhook</Button>
            <Button variant="secondary" onClick={() => { setIsCreating(false); setNewName(''); setNewUrl(''); }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {showSecretModal && createdSecret && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl max-w-lg w-full mx-4">
            <h3 className="text-lg font-bold dark:text-white mb-3">Webhook Secret</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Save this webhook secret. It's used to verify payloads are from OSDSarvaya.
              Each webhook payload includes an <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">X-OSDSarvaya-Signature</code> header.
            </p>
            <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded font-mono text-sm break-all dark:text-white">
              {createdSecret}
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => { navigator.clipboard.writeText(createdSecret); }}>
                Copy Secret
              </Button>
              <Button variant="secondary" onClick={() => { setShowSecretModal(false); setCreatedSecret(null); }}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {webhooks.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No webhooks configured yet. Add one to receive event notifications.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map(webhook => (
            <Card key={webhook.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium dark:text-white">{webhook.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${webhook.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400'}`}>
                      {webhook.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 break-all">{webhook.url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {webhook.events.map(event => (
                      <span key={event} className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded dark:text-gray-300">
                        {eventLabels[event] || event}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-3">
                  <Button variant="secondary" onClick={() => handleTest(webhook.id)} loading={testingId === webhook.id}>
                    Test
                  </Button>
                  <Button variant="secondary" onClick={() => handleToggle(webhook.id, !!webhook.is_active)} loading={togglingId === webhook.id}>
                    {webhook.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="danger" onClick={() => { if (window.confirm('Delete this webhook?')) onDeleteWebhook(webhook.id); }}>
                    Delete
                  </Button>
                </div>
              </div>
              {testResult && testResult.id === webhook.id && (
                <div className={`mt-3 p-2 rounded text-sm ${testResult.result.success ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {testResult.result.message}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default WebhooksManager;