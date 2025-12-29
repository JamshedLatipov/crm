import { ApiProperty } from '@nestjs/swagger';

export class CallsByTimeDto {
  @ApiProperty({ description: 'Time period (hour 0-23 or date)', example: 14 })
  period: number | string;

  @ApiProperty({ description: 'Number of calls', example: 45 })
  count: number;
}

export class StatusDistributionDto {
  @ApiProperty({ description: 'Call status', example: 'ANSWERED' })
  status: string;

  @ApiProperty({ description: 'Number of calls with this status', example: 120 })
  count: number;

  @ApiProperty({ description: 'Percentage of total calls', example: 75.5 })
  percentage: number;
}

export class CallsOverviewDto {
  @ApiProperty({ description: 'Total number of calls', example: 500 })
  totalCalls: number;

  @ApiProperty({ description: 'Number of inbound calls', example: 320 })
  inboundCalls: number;

  @ApiProperty({ description: 'Number of outbound calls', example: 150 })
  outboundCalls: number;

  @ApiProperty({ description: 'Number of internal calls', example: 30 })
  internalCalls: number;

  @ApiProperty({ description: 'Number of answered calls', example: 450 })
  answeredCalls: number;

  @ApiProperty({ description: 'Number of missed calls', example: 30 })
  missedCalls: number;

  @ApiProperty({ description: 'Number of abandoned calls', example: 20 })
  abandonedCalls: number;

  @ApiProperty({ description: 'Average call duration in seconds', example: 235 })
  avgDuration: number;

  @ApiProperty({ description: 'Average wait time in seconds', example: 18 })
  avgWaitTime: number;

  @ApiProperty({
    description: 'Calls distribution by hour (0-23)',
    type: [CallsByTimeDto],
  })
  callsByHour: CallsByTimeDto[];

  @ApiProperty({
    description: 'Calls distribution by day',
    type: [CallsByTimeDto],
  })
  callsByDay: CallsByTimeDto[];

  @ApiProperty({
    description: 'Distribution of calls by status',
    type: [StatusDistributionDto],
  })
  statusDistribution: StatusDistributionDto[];
}
