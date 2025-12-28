import { ApiProperty } from '@nestjs/swagger';

export class AbandonedCallsByQueueDto {
  @ApiProperty({ description: 'Queue name', example: 'support' })
  queue: string;

  @ApiProperty({ description: 'Number of abandoned calls', example: 25 })
  abandonedCount: number;

  @ApiProperty({ description: 'Total calls in queue', example: 200 })
  totalCalls: number;

  @ApiProperty({ description: 'Abandon rate percentage', example: 12.5 })
  abandonRate: number;

  @ApiProperty({ description: 'Average abandon time in seconds', example: 45 })
  avgAbandonTime: number;
}

export class AbandonedCallsByTimeDto {
  @ApiProperty({ description: 'Hour of day (0-23) or date', example: 14 })
  period: number | string;

  @ApiProperty({ description: 'Number of abandoned calls', example: 8 })
  count: number;
}

export class AbandonReasonDto {
  @ApiProperty({ description: 'Reason for abandonment', example: 'Long wait time' })
  reason: string;

  @ApiProperty({ description: 'Number of occurrences', example: 35 })
  count: number;

  @ApiProperty({ description: 'Percentage of total', example: 45.5 })
  percentage: number;
}

export class AbandonedCallsDto {
  @ApiProperty({ description: 'Total number of abandoned calls', example: 120 })
  totalAbandoned: number;

  @ApiProperty({ description: 'Total calls', example: 1000 })
  totalCalls: number;

  @ApiProperty({ description: 'Abandon rate percentage', example: 12.0 })
  abandonRate: number;

  @ApiProperty({ description: 'Average abandon time in seconds', example: 42 })
  avgAbandonTime: number;

  @ApiProperty({ description: 'Median abandon time in seconds', example: 38 })
  medianAbandonTime: number;

  @ApiProperty({ description: 'Abandoned calls by queue', type: [AbandonedCallsByQueueDto] })
  byQueue: AbandonedCallsByQueueDto[];

  @ApiProperty({ description: 'Abandoned calls by hour', type: [AbandonedCallsByTimeDto] })
  byHour: AbandonedCallsByTimeDto[];

  @ApiProperty({ description: 'Abandoned calls by day', type: [AbandonedCallsByTimeDto] })
  byDay: AbandonedCallsByTimeDto[];

  @ApiProperty({ description: 'Abandonment reasons distribution', type: [AbandonReasonDto] })
  reasons: AbandonReasonDto[];
}
