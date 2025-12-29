import { ApiProperty } from '@nestjs/swagger';

export class SlaTrendDto {
  @ApiProperty({ description: 'Date', example: '2024-01-15' })
  date: string;

  @ApiProperty({ description: 'SLA compliance rate percentage', example: 92.5 })
  complianceRate: number;

  @ApiProperty({ description: 'Total calls for this date', example: 150 })
  totalCalls: number;

  @ApiProperty({ description: 'SLA violated calls', example: 12 })
  violatedCalls: number;
}

export class QueueSlaDto {
  @ApiProperty({ description: 'Queue name', example: 'support' })
  queue: string;

  @ApiProperty({ description: 'Total calls in queue', example: 200 })
  totalCalls: number;

  @ApiProperty({ description: 'SLA compliant calls', example: 185 })
  compliantCalls: number;

  @ApiProperty({ description: 'SLA violated calls', example: 15 })
  violatedCalls: number;

  @ApiProperty({ description: 'Compliance rate percentage', example: 92.5 })
  complianceRate: number;

  @ApiProperty({ description: 'Average wait time in seconds', example: 25 })
  avgWaitTime: number;
}

export class SlaMetricsDto {
  @ApiProperty({ description: 'Total number of calls', example: 1000 })
  totalCalls: number;

  @ApiProperty({ description: 'Number of SLA compliant calls', example: 920 })
  slaCompliantCalls: number;

  @ApiProperty({ description: 'Number of SLA violated calls', example: 80 })
  slaViolatedCalls: number;

  @ApiProperty({ description: 'SLA compliance rate percentage', example: 92.0 })
  slaComplianceRate: number;

  @ApiProperty({ description: 'Average first response time in seconds', example: 18 })
  avgFirstResponseTime: number;

  @ApiProperty({ description: 'Number of abandoned calls', example: 45 })
  abandonedCallsCount: number;

  @ApiProperty({ description: 'Abandon rate percentage', example: 4.5 })
  abandonRate: number;

  @ApiProperty({ description: 'Average abandon time in seconds', example: 35 })
  avgAbandonTime: number;

  @ApiProperty({ description: 'SLA trend by date', type: [SlaTrendDto] })
  trend: SlaTrendDto[];

  @ApiProperty({ description: 'SLA metrics by queue', type: [QueueSlaDto] })
  byQueue: QueueSlaDto[];
}
