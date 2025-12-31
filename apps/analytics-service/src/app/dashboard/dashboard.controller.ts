import { Controller, Get, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DashboardService } from './dashboard.service';
import { ANALYTICS_PATTERNS } from '@crm/contracts';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(@Query('userId') userId?: string) {
    return this.dashboardService.getDashboard(userId ? parseInt(userId) : undefined);
  }

  @Get('manager')
  getManagerDashboard(@Query('userId') userId: string) {
    return this.dashboardService.getManagerDashboard(parseInt(userId));
  }

  @MessagePattern(ANALYTICS_PATTERNS.GET_DASHBOARD)
  handleGetDashboard(@Payload() data: { userId?: number }) {
    return this.dashboardService.getDashboard(data.userId);
  }
}
