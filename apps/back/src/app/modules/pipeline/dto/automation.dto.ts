import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsNumber, IsObject } from 'class-validator';
import { AutomationTrigger, AutomationCondition, AutomationAction, AutomationConditionRule, AutomationActionRule } from '../pipeline.entity';

export class CreateAutomationRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AutomationTrigger)
  trigger: AutomationTrigger;

  @IsArray()
  conditions: AutomationConditionRule[];

  @IsArray()
  actions: AutomationActionRule[];

  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class UpdateAutomationRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AutomationTrigger)
  trigger?: AutomationTrigger;

  @IsOptional()
  @IsArray()
  conditions?: AutomationConditionRule[];

  @IsOptional()
  @IsArray()
  actions?: AutomationActionRule[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class AutomationConditionRuleDto {
  @IsEnum(AutomationCondition)
  field: AutomationCondition;

  @IsString()
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'not_contains';

  value: string | number | boolean | string[];

  @IsOptional()
  value2?: string | number;
}

export class AutomationActionRuleDto {
  @IsEnum(AutomationAction)
  type: AutomationAction;

  @IsObject()
  config: Record<string, unknown>;
}