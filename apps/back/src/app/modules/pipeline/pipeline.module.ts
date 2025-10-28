import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelineService } from './pipeline.service';
import { AutomationService } from './automation.service';
import { PipelineController } from './pipeline.controller';
import { AutomationController } from './automation.controller';
import { PipelineStage, PipelineLead, AutomationRule } from './pipeline.entity';
import { Deal } from '../deals/deal.entity';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadModule } from '../leads/lead.module';
import { CompaniesModule } from '../companies/companies.module';
import { SharedModule } from '../shared/shared.module';
import { DealsModule } from '../deals/deals.module';
import { TaskModule } from '../tasks/task.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PipelineStage, PipelineLead, Deal, AutomationRule]),
    ContactsModule,
    forwardRef(() => LeadModule),
    forwardRef(() => DealsModule),
    CompaniesModule,
    SharedModule,
    forwardRef(() => TaskModule),
  ],
  providers: [PipelineService, AutomationService],
  controllers: [PipelineController, AutomationController],
  exports: [PipelineService, AutomationService],
})
export class PipelineModule {}
