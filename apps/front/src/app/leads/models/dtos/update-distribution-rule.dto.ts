export interface UpdateDistributionRuleDto {
  name?: string;
  description?: string;
  method?: string;
  conditions?: Record<string, string | number | boolean> | null;
  assignees?: string[];
  weights?: Record<string, number> | null;
  isActive?: boolean;
  priority?: number;
  maxLeadsPerUser?: number;
  workingHoursStart?: string | null;
  workingHoursEnd?: string | null;
  workingDays?: number[] | null;
}
