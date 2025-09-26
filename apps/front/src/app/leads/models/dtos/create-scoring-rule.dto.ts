export interface CreateScoringRuleDto {
  name: string;
  description?: string;
  type: string; // enum ScoringRuleType
  points: number;
  isActive?: boolean;
  conditions?: Record<string, string | number | boolean> | null;
  priority?: number;
}
