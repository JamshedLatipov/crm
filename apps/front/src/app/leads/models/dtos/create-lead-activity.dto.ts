export interface CreateLeadActivityDto {
  leadId: number | string;
  type: string; // enum from backend (ActivityType)
  title: string;
  description?: string | null;
  userId?: string | null;
  metadata?: Record<string, string | number | boolean> | null;
  scorePoints?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: string | null;
}
