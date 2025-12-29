import { ApiProperty } from '@nestjs/swagger';

export class IvrPathDto {
  @ApiProperty({ description: 'IVR path', example: '1000 -> greating -> Support' })
  path: string;

  @ApiProperty({ description: 'Number of calls', example: 150 })
  callCount: number;

  @ApiProperty({ description: 'Percentage of total', example: 25.5 })
  percentage: number;

  @ApiProperty({ description: 'Average time in IVR (seconds)', example: 45 })
  avgTimeInIvr: number;

  @ApiProperty({ description: 'Completion rate %', example: 85.5 })
  completionRate: number;
}

export class IvrNodeDto {
  @ApiProperty({ description: 'Node name', example: 'greating' })
  nodeName: string;

  @ApiProperty({ description: 'Number of visits', example: 200 })
  visits: number;

  @ApiProperty({ description: 'Average time spent (seconds)', example: 12 })
  avgTimeSpent: number;

  @ApiProperty({ description: 'Exit count', example: 15 })
  exitCount: number;

  @ApiProperty({ description: 'Exit rate %', example: 7.5 })
  exitRate: number;
}

export class IvrDtmfDto {
  @ApiProperty({ description: 'DTMF digit', example: '1' })
  digit: string;

  @ApiProperty({ description: 'Number of selections', example: 80 })
  count: number;

  @ApiProperty({ description: 'Percentage', example: 33.3 })
  percentage: number;

  @ApiProperty({ description: 'Node where selected', example: 'main_menu' })
  nodeName: string;
}

export class IvrEventStatsDto {
  @ApiProperty({ description: 'Event type', example: 'DTMF' })
  event: string;

  @ApiProperty({ description: 'Event count', example: 240 })
  count: number;
}

export class IvrAnalysisDto {
  @ApiProperty({ description: 'Total IVR sessions', example: 500 })
  totalSessions: number;

  @ApiProperty({ description: 'Completed sessions', example: 425 })
  completedSessions: number;

  @ApiProperty({ description: 'Completion rate %', example: 85.0 })
  completionRate: number;

  @ApiProperty({ description: 'Average IVR duration (seconds)', example: 38 })
  avgIvrDuration: number;

  @ApiProperty({ description: 'Popular IVR paths', type: [IvrPathDto] })
  paths: IvrPathDto[];

  @ApiProperty({ description: 'Node statistics', type: [IvrNodeDto] })
  nodes: IvrNodeDto[];

  @ApiProperty({ description: 'DTMF selections', type: [IvrDtmfDto] })
  dtmfSelections: IvrDtmfDto[];

  @ApiProperty({ description: 'Event statistics', type: [IvrEventStatsDto] })
  eventStats: IvrEventStatsDto[];
}
