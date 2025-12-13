import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Lead } from '../leads/lead.entity';
import { Deal } from '../deals/deal.entity';
import { Task } from '../tasks/task.entity';
import { PipelineStage } from '../pipeline/pipeline.entity';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Deal, Task, PipelineStage]), SharedModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
