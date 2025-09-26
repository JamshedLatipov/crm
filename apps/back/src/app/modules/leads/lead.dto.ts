import { ApiProperty } from '@nestjs/swagger';
import { LeadStatus, LeadSource, LeadPriority } from './lead.entity';

export class CreateLeadDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  company?: string;

  @ApiProperty({ required: false })
  position?: string;

  @ApiProperty({ enum: LeadStatus, required: false })
  status?: LeadStatus;

  @ApiProperty({ required: false })
  score?: number;

  @ApiProperty({ enum: LeadSource, required: false })
  source?: LeadSource;

  @ApiProperty({ required: false })
  sourceDetails?: string;

  @ApiProperty({ required: false })
  campaign?: string;

  @ApiProperty({ required: false })
  utmSource?: string;

  @ApiProperty({ required: false })
  utmMedium?: string;

  @ApiProperty({ required: false })
  utmCampaign?: string;

  @ApiProperty({ required: false })
  utmContent?: string;

  @ApiProperty({ required: false })
  utmTerm?: string;

  @ApiProperty({ required: false })
  assignedTo?: string;

  @ApiProperty({ enum: LeadPriority, required: false })
  priority?: LeadPriority;

  @ApiProperty({ required: false })
  estimatedValue?: number;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  customFields?: Record<string, string | number | boolean>;

  @ApiProperty({ required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  nextFollowUpDate?: Date;
}

export class UpdateLeadDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  company?: string;

  @ApiProperty({ required: false })
  position?: string;

  @ApiProperty({ enum: LeadStatus, required: false })
  status?: LeadStatus;

  @ApiProperty({ required: false })
  score?: number;

  @ApiProperty({ enum: LeadSource, required: false })
  source?: LeadSource;

  @ApiProperty({ required: false })
  sourceDetails?: string;

  @ApiProperty({ required: false })
  campaign?: string;

  @ApiProperty({ required: false })
  utmSource?: string;

  @ApiProperty({ required: false })
  utmMedium?: string;

  @ApiProperty({ required: false })
  utmCampaign?: string;

  @ApiProperty({ required: false })
  utmContent?: string;

  @ApiProperty({ required: false })
  utmTerm?: string;

  @ApiProperty({ required: false })
  assignedTo?: string;

  @ApiProperty({ enum: LeadPriority, required: false })
  priority?: LeadPriority;

  @ApiProperty({ required: false })
  estimatedValue?: number;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  customFields?: Record<string, string | number | boolean>;

  @ApiProperty({ required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  nextFollowUpDate?: Date;

  @ApiProperty({ required: false })
  isQualified?: boolean;

  @ApiProperty({ required: false })
  isUnsubscribed?: boolean;

  @ApiProperty({ required: false })
  isDoNotCall?: boolean;
}

export class AssignLeadDto {
  @ApiProperty({ required: false })
  user?: string;

  @ApiProperty({ required: false })
  managerId?: string;
}

export class ScoreLeadDto {
  @ApiProperty()
  score: number;
}

export class StatusLeadDto {
  @ApiProperty({ enum: LeadStatus })
  status: LeadStatus;
}

export class QualifyLeadDto {
  @ApiProperty()
  isQualified: boolean;
}

export class AddNoteDto {
  @ApiProperty()
  note: string;
}

export class AddTagsDto {
  @ApiProperty({ type: [String] })
  tags: string[];
}

export class RemoveTagsDto {
  @ApiProperty({ type: [String] })
  tags: string[];
}

export class ScheduleFollowUpDto {
  @ApiProperty()
  date: Date;

  @ApiProperty({ required: false })
  note?: string;
}

export class LeadFiltersDto {
  @ApiProperty({ enum: LeadStatus, isArray: true, required: false })
  status?: LeadStatus[];

  @ApiProperty({ enum: LeadSource, isArray: true, required: false })
  source?: LeadSource[];

  @ApiProperty({ enum: LeadPriority, isArray: true, required: false })
  priority?: LeadPriority[];

  @ApiProperty({ type: [String], required: false })
  assignedTo?: string[];

  @ApiProperty({ required: false })
  scoreMin?: number;

  @ApiProperty({ required: false })
  scoreMax?: number;

  @ApiProperty({ required: false })
  estimatedValueMin?: number;

  @ApiProperty({ required: false })
  estimatedValueMax?: number;

  @ApiProperty({ required: false })
  createdAfter?: Date;

  @ApiProperty({ required: false })
  createdBefore?: Date;

  @ApiProperty({ type: [String], required: false })
  tags?: string[];

  @ApiProperty({ required: false })
  isQualified?: boolean;

  @ApiProperty({ required: false })
  hasEmail?: boolean;

  @ApiProperty({ required: false })
  hasPhone?: boolean;

  @ApiProperty({ required: false })
  hasCompany?: boolean;

  @ApiProperty({ required: false })
  search?: string;
}
