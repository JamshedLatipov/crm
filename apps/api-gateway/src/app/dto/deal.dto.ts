import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator';

export class DealFilterRequestDto {
  @ApiPropertyOptional({ example: 'negotiation', description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter by assignee' })
  @IsOptional()
  @IsNumber()
  assigneeId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateDealRequestDto {
  @ApiProperty({ example: 'Enterprise License', description: 'Deal title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 50000, description: 'Deal value' })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ example: 'negotiation', description: 'Deal status/stage' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 75, description: 'Win probability (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional({ example: 1, description: 'Related contact ID' })
  @IsOptional()
  @IsNumber()
  contactId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Assignee user ID' })
  @IsOptional()
  @IsNumber()
  assigneeId?: number;

  @ApiPropertyOptional({ example: '2024-03-01', description: 'Expected close date' })
  @IsOptional()
  @IsString()
  expectedCloseDate?: string;
}

export class UpdateDealRequestDto {
  @ApiPropertyOptional({ example: 'Enterprise License v2' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 75000 })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ example: 'won', enum: ['new', 'negotiation', 'proposal', 'won', 'lost'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  probability?: number;

  @ApiPropertyOptional({ example: '2024-03-15' })
  @IsOptional()
  @IsString()
  expectedCloseDate?: string;
}

export class DealResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Enterprise License' })
  title: string;

  @ApiPropertyOptional({ example: 50000 })
  value?: number;

  @ApiProperty({ example: 'negotiation' })
  status: string;

  @ApiPropertyOptional({ example: 75 })
  probability?: number;

  @ApiPropertyOptional({ example: 1 })
  contactId?: number;

  @ApiPropertyOptional({ example: 1 })
  assigneeId?: number;

  @ApiPropertyOptional({ example: '2024-03-01' })
  expectedCloseDate?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-16T14:20:00.000Z' })
  updatedAt: string;
}

export class DealPipelineResponseDto {
  @ApiProperty({ example: 'negotiation' })
  stage: string;

  @ApiProperty({ example: 5 })
  count: number;

  @ApiProperty({ example: 250000 })
  totalValue: number;
}
