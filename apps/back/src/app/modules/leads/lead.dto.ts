import { ApiProperty } from '@nestjs/swagger';
import { LeadStatus, LeadSource, LeadPriority } from './lead.entity';
import { IsString, IsOptional, IsEmail, IsEnum, IsNumber, IsArray, IsDateString } from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ enum: LeadStatus, required: false })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiProperty({ enum: LeadSource, required: false })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceDetails?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  campaign?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  utmContent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  utmTerm?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiProperty({ enum: LeadPriority, required: false })
  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  customFields?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: Date;
}

export class UpdateLeadDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ enum: LeadStatus, required: false })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiProperty({ enum: LeadSource, required: false })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceDetails?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  campaign?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  utmContent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  utmTerm?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiProperty({ enum: LeadPriority, required: false })
  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  customFields?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  nextFollowUpDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  isQualified?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  isUnsubscribed?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
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
