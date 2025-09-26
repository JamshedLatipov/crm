export interface CreateDistributionRuleDto {
  name: string;
  description?: string;
  method?: string; // enum DistributionMethod
  conditions?: Record<string, string | number | boolean> | null;
  assignees: string[]; // array of manager IDs
  weights?: Record<string, number> | null;
  isActive?: boolean;
  priority?: number;
  maxLeadsPerUser?: number;
  workingHoursStart?: string | null; // HH:mm
  workingHoursEnd?: string | null; // HH:mm
  workingDays?: number[] | null; // 0-6
}
