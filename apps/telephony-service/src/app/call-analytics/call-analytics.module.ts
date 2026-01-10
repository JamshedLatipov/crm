import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallAnalyticsController } from './call-analytics.controller';
import { CallAnalyticsService } from './call-analytics.service';
import { CallLog } from '../call/entities/call-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CallLog])],
  controllers: [CallAnalyticsController],
  providers: [CallAnalyticsService],
  exports: [CallAnalyticsService],
})
export class CallAnalyticsModule {}
