import { Controller, Get, Post, Body, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService, ReportConfig } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  async getSalesReport(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    const config: ReportConfig = {
      type: 'sales',
      fromDate: new Date(fromDate || this.getDefaultFromDate()),
      toDate: new Date(toDate || new Date().toISOString()),
      groupBy,
    };
    return this.reportsService.generateSalesReport(config);
  }

  @Get('leads')
  async getLeadsReport(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    const config: ReportConfig = {
      type: 'leads',
      fromDate: new Date(fromDate || this.getDefaultFromDate()),
      toDate: new Date(toDate || new Date().toISOString()),
      groupBy,
    };
    return this.reportsService.generateLeadsReport(config);
  }

  @Get('calls')
  async getCallsReport(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    const config: ReportConfig = {
      type: 'calls',
      fromDate: new Date(fromDate || this.getDefaultFromDate()),
      toDate: new Date(toDate || new Date().toISOString()),
      groupBy,
    };
    return this.reportsService.generateCallsReport(config);
  }

  @Get('performance')
  async getPerformanceReport(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const config: ReportConfig = {
      type: 'performance',
      fromDate: new Date(fromDate || this.getDefaultFromDate()),
      toDate: new Date(toDate || new Date().toISOString()),
    };
    return this.reportsService.generatePerformanceReport(config);
  }

  @Get('sales/export')
  async exportSalesReport(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month',
    @Res() res: Response,
  ) {
    const config: ReportConfig = {
      type: 'sales',
      fromDate: new Date(fromDate || this.getDefaultFromDate()),
      toDate: new Date(toDate || new Date().toISOString()),
      groupBy,
    };
    const report = await this.reportsService.generateSalesReport(config);
    const csv = await this.reportsService.exportToCsv(report);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
    res.send(csv);
  }

  @Post('generate')
  async generateCustomReport(@Body() config: ReportConfig) {
    switch (config.type) {
      case 'sales':
        return this.reportsService.generateSalesReport(config);
      case 'leads':
        return this.reportsService.generateLeadsReport(config);
      case 'calls':
        return this.reportsService.generateCallsReport(config);
      case 'performance':
        return this.reportsService.generatePerformanceReport(config);
      default:
        return { error: 'Unknown report type' };
    }
  }

  private getDefaultFromDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString();
  }
}
