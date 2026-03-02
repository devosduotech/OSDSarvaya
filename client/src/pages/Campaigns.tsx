import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { CampaignTemplate } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  PlusIcon,
  SendIcon,
  TrashIcon,
  EditIcon
} from '../components/icons/Icons';

const MAX_FILE_SIZE_MB = 10;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/3gpp',
  'video/quicktime',
  'application/pdf'
];

const ALLOWED_TYPES_DISPLAY = 'Images (JPEG, PNG, GIF, WebP), Videos (MP4, 3GPP, QuickTime), PDF';

const isAllowedFileType = (mimeType: string) => {
  return ALLOWED_MIME_TYPES.includes(mimeType);
};

const toISTDateInput = (date: Date) => {
  return date.toISOString().slice(0, 16);
};

const toISOTimeFromInput = (value: string) => {
  const istDateStr = value + ':00+05:30';
  const istDate = new Date(istDateStr);
  return istDate.toISOString();
};

const formatDateIST = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const getFileTypeCategory = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'other';
};

const getAllowedTypesError = () => {
  return `Invalid file type. Allowed: ${ALLOWED_TYPES_DISPLAY}`;
};

const Campaigns: React.FC = () => {

  const {
    campaignTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    groups,
    startCampaignRun,
    scheduleCampaign,
    isWhatsAppConnected,
    isCampaignRunning,
    contacts
  } = useAppContext();

  const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
  const [isSendModalOpen, setSendModalOpen] = useState(false);
  const [isPreviewOpen, setPreviewOpen] = useState(false);

  const [currentTemplate, setCurrentTemplate] = useState<Partial<CampaignTemplate>>({});
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  const [templateToSend, setTemplateToSend] = useState<CampaignTemplate | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ================================
  // TEMPLATE HANDLING
  // ================================
  const openNewTemplateModal = () => {
    setCurrentTemplate({});
    setEditingTemplateId(null);
    setTemplateModalOpen(true);
  };

  const openEditTemplateModal = (template: CampaignTemplate) => {
    setCurrentTemplate(template);
    setEditingTemplateId(template.id);
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!currentTemplate.name) return alert("Template name required");

    setIsSaving(true);
    if (editingTemplateId) {
      await updateTemplate({ ...currentTemplate, id: editingTemplateId } as CampaignTemplate);
    } else {
      await addTemplate(currentTemplate as any);
    }

    setIsSaving(false);
    setTemplateModalOpen(false);
  };

  // ================================
  // FILE HANDLING
  // ================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return alert(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`);
    }

    if (!isAllowedFileType(file.type)) {
      return alert(getAllowedTypesError());
    }

    const reader = new FileReader();

    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1];

      setCurrentTemplate(prev => ({
        ...prev,
        attachment: {
          data: base64,
          mimeType: file.type,
          filename: file.name,
          size: file.size
        }
      }));
    };

    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setCurrentTemplate(prev => {
      const { attachment, ...rest } = prev;
      return rest;
    });
  };

  // ================================
  // SEND CAMPAIGN
  // ================================
  const openSendModal = (template: CampaignTemplate) => {
    setTemplateToSend(template);
    setSelectedGroupIds([]);
    setSendModalOpen(true);
  };

  const handleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleLaunchCampaign = async () => {
    if (!templateToSend) return;

    setIsSending(true);
    const success = await startCampaignRun(
      templateToSend.id,
      selectedGroupIds
    );

    if (success) {
      setSendModalOpen(false);
      setScheduledTime('');
    }
    setIsSending(false);
  };

  const handleScheduleCampaign = async () => {
    if (!templateToSend || !scheduledTime) return;

    const utcTime = toISOTimeFromInput(scheduledTime);

    const result = await scheduleCampaign(
      templateToSend.id,
      selectedGroupIds,
      utcTime
    );

    if (result?.success) {
      alert(`Campaign scheduled for ${formatDateIST(utcTime)}`);
      setSendModalOpen(false);
      setScheduledTime('');
    } else {
      alert('Failed to schedule campaign');
    }
  };

  // ================================
  // PREVIEW
  // ================================
  const sampleContact = contacts[0];

  const previewMessage = currentTemplate.message
    ? currentTemplate.message.replace('{{name}}', sampleContact?.name || 'Customer')
    : '';

  // ================================
  // RENDER
  // ================================
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <Card>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Campaign Templates</h2>
          <Button onClick={openNewTemplateModal}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>
      </Card>

      {/* GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaignTemplates.map(t => {
          const attachment = t.attachment;

          const isImage = attachment?.mimeType?.startsWith('image/') || false;
          const fileType = attachment ? getFileTypeCategory(attachment.mimeType) : null;

          const imageSrc = isImage && attachment
            ? `data:${attachment.mimeType};base64,${attachment.data}`
            : null;

          return (
            <Card key={t.id} className="flex flex-col justify-between">

              <div>
                <h3 className="font-bold mb-2">{t.name}</h3>

                {/* IMAGE PREVIEW */}
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    className="w-full h-40 object-cover rounded mb-3"
                  />
                ) : t.attachment ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 bg-slate-50 p-3 rounded">
                    {fileType === 'pdf' && '📄'}
                    {fileType === 'video' && '🎬'}
                    <span className="truncate">{t.attachment.filename}</span>
                  </div>
                ) : null}

                <p className="text-sm bg-slate-50 dark:bg-slate-700 dark:text-white p-3 rounded h-24 overflow-y-auto whitespace-pre-wrap">
                  {t.message || 'No message'}
                </p>
              </div>

              {/* ACTIONS */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <span className="text-xs text-gray-400">
                  {new Date(t.createdAt).toLocaleDateString()}
                </span>

                <div className="flex gap-2">
                  <Button onClick={() => openSendModal(t)}>
                    <SendIcon className="w-4 h-4 mr-1" />
                    Send
                  </Button>

                  <Button variant="secondary" onClick={() => openEditTemplateModal(t)}>
                    <EditIcon className="w-4 h-4 mr-1" />
                    Edit
                  </Button>

                  <Button variant="danger" onClick={() => deleteTemplate(t.id)}>
                    <TrashIcon className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>

            </Card>
          );
        })}
      </div>

      {/* TEMPLATE MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg p-6 rounded-xl space-y-4">

            <h2 className="text-xl font-bold dark:text-white">
              {editingTemplateId ? 'Edit Template' : 'New Template'}
            </h2>

            <input
              className="w-full p-3 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              placeholder="Template Name"
              value={currentTemplate.name || ''}
              onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
            />

            <textarea
              rows={4}
              className="w-full p-3 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white whitespace-pre-wrap"
              placeholder="Message (use {{name}})"
              value={currentTemplate.message || ''}
              onChange={(e) => setCurrentTemplate({ ...currentTemplate, message: e.target.value })}
            />

            {/* ATTACHMENT */}
            {!currentTemplate.attachment ? (
              <>
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  Attach File (max 10MB)
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  Allowed: {ALLOWED_TYPES_DISPLAY}
                </p>
              </>
            ) : (
              <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-600 p-3 rounded">
                <div className="flex items-center gap-2">
                  {getFileTypeCategory(currentTemplate.attachment.mimeType) === 'image' && '🖼️'}
                  {getFileTypeCategory(currentTemplate.attachment.mimeType) === 'video' && '🎬'}
                  {getFileTypeCategory(currentTemplate.attachment.mimeType) === 'pdf' && '📄'}
                  <span className="text-sm dark:text-white">{currentTemplate.attachment.filename}</span>
                </div>
                <button onClick={removeAttachment} className="text-gray-500 dark:text-gray-200 hover:text-red-500">✕</button>
              </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept=".pdf,image/*,video/*" 
              hidden 
            />

            {/* ACTIONS */}
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
                Preview
              </Button>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setTemplateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate} loading={isSaving}>
                  Save
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            <h3 className="font-bold mb-3">Preview</h3>

            {/* WhatsApp style: Image/Video on top, caption (message) below */}
            {currentTemplate.attachment && (
              <>
                {currentTemplate.attachment.mimeType.startsWith('image/') && (
                  <img
                    src={`data:${currentTemplate.attachment.mimeType};base64,${currentTemplate.attachment.data}`}
                    className="w-full rounded mb-3"
                    alt="Attachment"
                  />
                )}
                {currentTemplate.attachment.mimeType.startsWith('video/') && (
                  <div className="bg-slate-100 p-4 rounded mb-3 text-center">
                    <div className="text-4xl mb-2">🎬</div>
                    <div className="text-sm text-gray-600">{currentTemplate.attachment.filename}</div>
                    <div className="text-xs text-gray-400">Video will be sent as attachment</div>
                  </div>
                )}
                {currentTemplate.attachment.mimeType === 'application/pdf' && (
                  <div className="bg-slate-100 p-4 rounded mb-3 text-center">
                    <div className="text-4xl mb-2">📄</div>
                    <div className="text-sm text-gray-600">{currentTemplate.attachment.filename}</div>
                    <div className="text-xs text-gray-400">PDF will be sent as attachment</div>
                  </div>
                )}
              </>
            )}

            <div className="bg-gray-100 dark:bg-slate-700 dark:text-white p-4 rounded whitespace-pre-wrap">
              {previewMessage || 'No message'}
            </div>

            <div className="flex justify-end mt-3">
              <Button onClick={() => setPreviewOpen(false)}>Close</Button>
            </div>

          </div>
        </div>
      )}

      {/* SEND MODAL */}
      {isSendModalOpen && templateToSend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg p-6 rounded-xl max-h-[90vh] overflow-y-auto">

            <h2 className="text-xl font-bold mb-4">Send Campaign</h2>

            <div className="space-y-2 max-h-40 overflow-y-auto border p-3 rounded mb-4 dark:border-slate-600">
              {groups.map(g => (
                <label key={g.id} className="flex items-center gap-2 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(g.id)}
                    onChange={() => handleGroupSelection(g.id)}
                  />
                  {g.name}
                </label>
              ))}
            </div>

            {/* SCHEDULE OPTION */}
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700 rounded">
              <label className="flex items-center gap-2 mb-2 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={!!scheduledTime}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const now = new Date();
                      now.setHours(now.getHours() + 1);
                      setScheduledTime(toISTDateInput(now));
                    } else {
                      setScheduledTime('');
                    }
                  }}
                />
                <span className="font-medium">Schedule for later</span>
              </label>
              
              {scheduledTime && (
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-slate-600 dark:border-slate-500 dark:text-white"
                  min={toISTDateInput(new Date())}
                />
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => {
                setSendModalOpen(false);
                setScheduledTime('');
              }}>
                Cancel
              </Button>

              {scheduledTime ? (
                <Button
                  onClick={handleScheduleCampaign}
                  disabled={selectedGroupIds.length === 0}
                  loading={isSending}
                >
                  Schedule Campaign
                </Button>
              ) : (
                <Button
                  onClick={handleLaunchCampaign}
                  disabled={!isWhatsAppConnected || isCampaignRunning || selectedGroupIds.length === 0}
                  loading={isSending}
                >
                  {isCampaignRunning ? 'Sending...' : 'Send Now'}
                </Button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Campaigns;
