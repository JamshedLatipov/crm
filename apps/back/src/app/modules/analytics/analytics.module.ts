import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallSummary } from '../calls/entities/call-summary.entity';
import { Cdr } from '../calls/entities/cdr.entity';
import { QueueLog } from '../calls/entities/queuelog.entity';
import { IvrLog } from '../ivr/entities/ivr-log.entity';
import { Lead } from '../leads/lead.entity';
import { Deal } from '../deals/deal.entity';
import { UserModule } from '../user/user.module';
import { CallsAnalyticsController } from './controllers';
import { AgentPerformanceService, CallsOverviewService, SlaMetricsService, AbandonedCallsService, QueuePerformanceService, IvrAnalysisService, CallConversionService } from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([CallSummary, Cdr, QueueLog, IvrLog, Lead, Deal]),
    UserModule,
  ],
  controllers: [CallsAnalyticsController],
  providers: [AgentPerformanceService, CallsOverviewService, SlaMetricsService, AbandonedCallsService, QueuePerformanceService, IvrAnalysisService, CallConversionService],
  exports: [AgentPerformanceService, CallsOverviewService, SlaMetricsService, AbandonedCallsService, QueuePerformanceService, IvrAnalysisService, CallConversionService],
})
export class AnalyticsModule {}
