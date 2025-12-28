import { ApiProperty } from '@nestjs/swagger';

export class ConversionByAgentDto {
  @ApiProperty({ description: 'Agent name', example: 'operator1' })
  agent: string;

  @ApiProperty({ description: 'Total calls', example: 150 })
  totalCalls: number;

  @ApiProperty({ description: 'Calls with leads', example: 45 })
  callsWithLeads: number;

  @ApiProperty({ description: 'Calls with deals', example: 12 })
  callsWithDeals: number;

  @ApiProperty({ description: 'Lead conversion rate %', example: 30.0 })
  leadConversionRate: number;

  @ApiProperty({ description: 'Deal conversion rate %', example: 8.0 })
  dealConversionRate: number;

  @ApiProperty({ description: 'Average deal value', example: 5000 })
  avgDealValue: number;

  @ApiProperty({ description: 'Total revenue generated', example: 60000 })
  totalRevenue: number;
}

export class ConversionTrendDto {
  @ApiProperty({ description: 'Date', example: '2025-12-01' })
  date: string;

  @ApiProperty({ description: 'Total calls', example: 25 })
  totalCalls: number;

  @ApiProperty({ description: 'Leads created', example: 8 })
  leadsCreated: number;

  @ApiProperty({ description: 'Deals created', example: 2 })
  dealsCreated: number;

  @ApiProperty({ description: 'Lead conversion rate', example: 32.0 })
  leadConversionRate: number;

  @ApiProperty({ description: 'Deal conversion rate', example: 8.0 })
  dealConversionRate: number;
}

export class DealStageDto {
  @ApiProperty({ description: 'Deal status', example: 'open' })
  status: string;

  @ApiProperty({ description: 'Number of deals', example: 15 })
  count: number;

  @ApiProperty({ description: 'Total value', example: 75000 })
  totalValue: number;

  @ApiProperty({ description: 'Percentage', example: 45.5 })
  percentage: number;
}

export class CallConversionDto {
  @ApiProperty({ description: 'Total calls analyzed', example: 500 })
  totalCalls: number;

  @ApiProperty({ description: 'Calls resulting in leads', example: 150 })
  callsWithLeads: number;

  @ApiProperty({ description: 'Calls resulting in deals', example: 40 })
  callsWithDeals: number;

  @ApiProperty({ description: 'Overall lead conversion rate %', example: 30.0 })
  leadConversionRate: number;

  @ApiProperty({ description: 'Overall deal conversion rate %', example: 8.0 })
  dealConversionRate: number;

  @ApiProperty({ description: 'Total revenue from calls', example: 200000 })
  totalRevenue: number;

  @ApiProperty({ description: 'Average deal size', example: 5000 })
  avgDealSize: number;

  @ApiProperty({ description: 'ROI (revenue per call)', example: 400 })
  revenuePerCall: number;

  @ApiProperty({ description: 'Conversion by agent', type: [ConversionByAgentDto] })
  byAgent: ConversionByAgentDto[];

  @ApiProperty({ description: 'Conversion trend over time', type: [ConversionTrendDto] })
  trend: ConversionTrendDto[];

  @ApiProperty({ description: 'Deal stage distribution', type: [DealStageDto] })
  dealStages: DealStageDto[];
}
