export interface UpdateLeadActivityDto {
  title?: string;
  description?: string | null;
  metadata?: Record<string, string | number | boolean> | null;
  scorePoints?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  source?: string | null;
}
