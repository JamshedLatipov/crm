import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { LeadActivity } from './entities/lead-activity.entity';
import { LeadHistory } from './entities/lead-history.entity';
import { LeadScore } from './entities/lead-score.entity';
import { LeadScoringRule } from './entities/lead-scoring-rule.entity';
import { LeadDistributionRule } from './entities/lead-distribution-rule.entity';
import { Deal } from '../deals/deal.entity';
import { LeadService } from './lead.service';
import { LeadScoringService } from './services/lead-scoring.service';
import { LeadDistributionService } from './services/lead-distribution.service';
import { LeadCaptureService } from './services/lead-capture.service';
import { LeadHistoryService } from './services/lead-history.service';
import { LeadController } from './lead.controller';
import { LeadScoringController } from './controllers/lead-scoring.controller';
import { LeadDistributionController } from './controllers/lead-distribution.controller';
import { LeadCaptureController } from './controllers/lead-capture.controller';
import { LeadHistoryController } from './controllers/lead-history.controller';
import { UserModule } from '../user/user.module';
import { forwardRef } from '@nestjs/common';
import { PipelineModule } from '../pipeline/pipeline.module';
import { DealsModule } from '../deals/deals.module';
import { NotificationModule } from '../notifications/notification.module';
import { SharedModule } from '../shared/shared.module';
import { CompaniesModule } from '../companies/companies.module';
import { PromoCompaniesModule } from '../promo-companies/promo-companies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      LeadActivity,
      LeadHistory,
      LeadScore,
      LeadScoringRule,
      LeadDistributionRule,
      Deal,
      // ensure Contact repository is available to LeadService
      (require('../contacts/contact.entity').Contact)
    ]),
  CompaniesModule,
  // also import ContactsModule to reuse ContactsService if needed
  require('../contacts/contacts.module').ContactsModule,
  forwardRef(() => PipelineModule),
    UserModule,
    DealsModule,
    NotificationModule,
    SharedModule,
    PromoCompaniesModule
  ],
  providers: [
    LeadService,
    LeadScoringService,
    LeadDistributionService,
    LeadCaptureService,
    LeadHistoryService
  ],
  controllers: [
    LeadController,
    LeadScoringController,
    LeadDistributionController,
    LeadCaptureController,
    LeadHistoryController
  ],
  exports: [
    LeadService,
    LeadScoringService,
    LeadDistributionService,
    LeadCaptureService,
    LeadHistoryService
  ],
})
export class LeadModule {}
