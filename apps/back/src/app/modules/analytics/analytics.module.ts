import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallSummary } from '../calls/entities/call-summary.entity';
import { Cdr } from '../calls/entities/cdr.entity';
import { QueueLog } from '../calls/entities/queuelog.entity';
import { UserModule } from '../user/user.module';
import { CallsAnalyticsController } from './controllers';
import { AgentPerformanceService, CallsOverviewService, SlaMetricsService, AbandonedCallsService, QueuePerformanceService } from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallSummary, Cdr, QueueLog]),
    UserModule,
  ],
  controllers: [CallsAnalyticsController],
  providers: [AgentPerformanceService, CallsOverviewService, SlaMetricsService, AbandonedCallsService, QueuePerformanceService],
  exports: [AgentPerformanceService, CallsOverviewService, SlaMetricsService, AbandonedCallsService, QueuePerformanceService],
})
export class AnalyticsModule {}
