import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgentPerformanceDto {
  @ApiProperty({
    description: 'Agent identifier',
    example: 'operator1',
  })
  agent: string;

  @ApiProperty({
    description: 'Total number of calls',
    example: 150,
  })
  totalCalls: number;

  @ApiProperty({
    description: 'Number of answered calls',
    example: 140,
  })
  answeredCalls: number;

  @ApiProperty({
    description: 'Number of missed calls',
    example: 10,
  })
  missedCalls: number;

  @ApiProperty({
    description: 'Average talk time in seconds',
    example: 245,
  })
  avgTalkTime: number;

  @ApiProperty({
    description: 'Average wait time in seconds',
    example: 15,
  })
  avgWaitTime: number;

  @ApiProperty({
    description: 'Total talk time in seconds',
    example: 34300,
  })
  totalTalkTime: number;

  @ApiPropertyOptional({
    description: 'Conversion rate to leads/deals (percentage)',
    example: 35.5,
  })
  conversionRate?: number;
}

export class AgentPerformanceResponseDto {
  @ApiProperty({
    description: 'List of agent performance metrics',
    type: [AgentPerformanceDto],
  })
  data: AgentPerformanceDto[];

  @ApiProperty({
    description: 'Total number of agents',
    example: 10,
  })
  total: number;
}
