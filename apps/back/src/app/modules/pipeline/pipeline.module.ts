import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelineService } from './pipeline.service';
import { AutomationService } from './automation.service';
import { PipelineController } from './pipeline.controller';
import { PipelineStage, PipelineLead } from './pipeline.entity';
import { Deal } from '../deals/deal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PipelineStage, PipelineLead, Deal])],
  providers: [PipelineService, AutomationService],
  controllers: [PipelineController],
  exports: [PipelineService],
})
export class PipelineModule {}
