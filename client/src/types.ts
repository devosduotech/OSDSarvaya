
export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  tags: string;
  optedIn?: number;
  optedInAt?: string;
  optedOutAt?: string;
}

export interface Group {
  id: string;
  name: string;
  contactIds: string[];
}

export type CampaignStatus = 'Queued' | 'Sending' | 'Sent' | 'Failed' | 'Stopped' | 'Cancelled' | 'Scheduled';

export interface Attachment {
  data: string; // base64 encoded string
  mimeType: string;
  filename: string;
  size: number; // in bytes
}

export interface CampaignTemplate {
  id: string;
  name: string;
  message: string;
  createdAt: string; // ISO string
  attachment?: Attachment;
}

export interface CampaignRun {
    id: string;
    campaignTemplateId: string;
    targetGroupIds: string[];
    status: CampaignStatus;
    createdAt: string; // ISO string
}

export interface CampaignReport {
  campaignRunId: string;
  totalContacts: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  progress: number;
}

export interface FailedMessage {
  id: number;
  campaignRunId: string;
  contactPhone: string;
  contactName: string | null;
  reason: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  rate_limit: number;
  is_active: number;
  created_at: string;
  last_used_at: string | null;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: number;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  apiKeyId: string | null;
  apiKeyName: string | null;
  recipientPhone: string;
  recipientName: string | null;
  message: string | null;
  status: string;
  externalId: string | null;
  error: string | null;
  createdAt: string;
  deliveredAt: string | null;
}
