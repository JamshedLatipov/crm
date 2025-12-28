import { ApiProperty } from '@nestjs/swagger';

export class QueueStatsDto {
  @ApiProperty({ description: 'Queue name', example: 'support' })
  queue: string;

  @ApiProperty({ description: 'Total calls in queue', example: 150 })
  totalCalls: number;

  @ApiProperty({ description: 'Answered calls', example: 135 })
  answeredCalls: number;

  @ApiProperty({ description: 'Abandoned calls', example: 15 })
  abandonedCalls: number;

  @ApiProperty({ description: 'Answer rate percentage', example: 90.0 })
  answerRate: number;

  @ApiProperty({ description: 'Average wait time in seconds', example: 25 })
  avgWaitTime: number;

  @ApiProperty({ description: 'Max wait time in seconds', example: 120 })
  maxWaitTime: number;

  @ApiProperty({ description: 'Average talk time in seconds', example: 180 })
  avgTalkTime: number;

  @ApiProperty({ description: 'Service level compliance %', example: 85.5 })
  serviceLevelCompliance: number;
}

export class QueueAgentDto {
  @ApiProperty({ description: 'Queue name', example: 'support' })
  queue: string;

  @ApiProperty({ description: 'Agent name', example: 'operator1' })
  agent: string;

  @ApiProperty({ description: 'Calls handled', example: 45 })
  callsHandled: number;

  @ApiProperty({ description: 'Average handle time in seconds', example: 200 })
  avgHandleTime: number;
}

export class QueueHourlyStatsDto {
  @ApiProperty({ description: 'Hour of day (0-23)', example: 14 })
  hour: number;

  @ApiProperty({ description: 'Total calls', example: 25 })
  totalCalls: number;

  @ApiProperty({ description: 'Answered calls', example: 22 })
  answeredCalls: number;

  @ApiProperty({ description: 'Average wait time', example: 30 })
  avgWaitTime: number;
}

export class QueuePerformanceDto {
  @ApiProperty({ description: 'Overall queue statistics', type: [QueueStatsDto] })
  queueStats: QueueStatsDto[];

  @ApiProperty({ description: 'Top performing agents by queue', type: [QueueAgentDto] })
  topAgents: QueueAgentDto[];

  @ApiProperty({ description: 'Hourly distribution', type: [QueueHourlyStatsDto] })
  hourlyStats: QueueHourlyStatsDto[];

  @ApiProperty({ description: 'Total calls across all queues', example: 500 })
  totalCalls: number;

  @ApiProperty({ description: 'Overall answer rate', example: 88.5 })
  overallAnswerRate: number;

  @ApiProperty({ description: 'Overall average wait time', example: 28 })
  overallAvgWaitTime: number;
}
