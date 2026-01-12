import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  // 4.1 Leads overview
  @Get('leads/overview')
  async leadsOverview(@Query('days') days = '30') {
    return this.svc.leadsOverview(Number(days));
  }

  // 4.2 Funnel analytics
  @Get('funnel')
  async funnel() {
    return this.svc.funnelAnalytics();
  }

  // 4.3 Revenue forecast
  @Get('forecast')
  async forecast(@Query('period') period: 'month' | 'quarter' | 'year' = 'month') {
    return this.svc.revenueForecast(period);
  }

  // 4.4 Tasks report
  @Get('tasks')
  async tasks(@Query('days') days = '30') {
    return this.svc.tasksReport(Number(days));
  }

  // Contacts report with optional custom field grouping
  @Get('contacts')
  async contacts(@Query('groupBy') groupBy?: string) {
    return this.svc.contactsReport(groupBy);
  }

  // Custom field distribution report
  @Get('contacts/custom-field/:fieldName')
  async customFieldDistribution(@Query('fieldName') fieldName: string) {
    return this.svc.contactsCustomFieldDistribution(fieldName);
  }
}
