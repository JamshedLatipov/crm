import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class CallFilterRequestDto {
  @ApiPropertyOptional({ example: 'completed', description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'outbound', enum: ['inbound', 'outbound'], description: 'Call direction' })
  @IsOptional()
  @IsString()
  direction?: string;

  @ApiPropertyOptional({ example: 1, description: 'Filter by operator ID' })
  @IsOptional()
  @IsNumber()
  operatorId?: number;

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

export class InitiateCallRequestDto {
  @ApiProperty({ example: '+1234567890', description: 'Phone number to call' })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({ example: 1, description: 'Related lead ID' })
  @IsOptional()
  @IsNumber()
  leadId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Related contact ID' })
  @IsOptional()
  @IsNumber()
  contactId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Related deal ID' })
  @IsOptional()
  @IsNumber()
  dealId?: number;
}

export class CallResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'abc-123-def' })
  callId: string;

  @ApiProperty({ example: '+1234567890' })
  phoneNumber: string;

  @ApiProperty({ example: 'outbound' })
  direction: string;

  @ApiProperty({ example: 'completed' })
  status: string;

  @ApiPropertyOptional({ example: 180, description: 'Call duration in seconds' })
  duration?: number;

  @ApiPropertyOptional({ example: 1 })
  operatorId?: number;

  @ApiPropertyOptional({ example: 1 })
  leadId?: number;

  @ApiPropertyOptional({ example: 1 })
  contactId?: number;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  startTime: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:33:00.000Z' })
  endTime?: string;
}

export class OperatorStatusDto {
  @ApiProperty({ example: 1 })
  operatorId: number;

  @ApiProperty({ example: 'available', enum: ['available', 'busy', 'offline', 'on_call'] })
  status: string;

  @ApiPropertyOptional({ example: 'abc-123-def', description: 'Current call ID if on call' })
  currentCallId?: string;
}

export class SipCredentialsResponseDto {
  @ApiProperty({ example: '1001' })
  username: string;

  @ApiProperty({ example: 'sippass123' })
  password: string;

  @ApiProperty({ example: 'sip.example.com' })
  domain: string;

  @ApiProperty({ example: 'ws://sip.example.com:8089/ws' })
  wsUrl: string;
}

export class CallStatsResponseDto {
  @ApiProperty({ example: 100 })
  totalCalls: number;

  @ApiProperty({ example: 60 })
  answeredCalls: number;

  @ApiProperty({ example: 40 })
  missedCalls: number;

  @ApiProperty({ example: 120, description: 'Average call duration in seconds' })
  avgDuration: number;

  @ApiProperty({ example: 60, description: 'Answer rate percentage' })
  answerRate: number;
}
