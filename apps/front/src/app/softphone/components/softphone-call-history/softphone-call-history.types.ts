export interface CallHistoryItem {
  id: string;
  number: string;
  timestamp: Date;
  duration: string;
  status: 'completed' | 'missed' | 'failed';
  type: 'incoming' | 'outgoing';
  notes?: string;
  contactName?: string;
  contactId?: string;
}