export interface UpdateScoringRuleDto {
  name?: string;
  description?: string;
  type?: string;
  points?: number;
  isActive?: boolean;
  conditions?: Record<string, string | number | boolean> | null;
  priority?: number;
}
