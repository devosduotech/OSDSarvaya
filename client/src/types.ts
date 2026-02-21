
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

export type CampaignStatus = 'Queued' | 'Sending' | 'Sent' | 'Failed' | 'Stopped' | 'Cancelled';

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
