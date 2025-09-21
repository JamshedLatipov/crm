import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { LeadActivity } from './entities/lead-activity.entity';
import { LeadScoringRule } from './entities/lead-scoring-rule.entity';
import { LeadDistributionRule } from './entities/lead-distribution-rule.entity';
import { LeadService } from './lead.service';
import { LeadScoringService } from './services/lead-scoring.service';
import { LeadDistributionService } from './services/lead-distribution.service';
import { LeadCaptureService } from './services/lead-capture.service';
import { LeadController } from './lead.controller';
import { LeadScoringController } from './controllers/lead-scoring.controller';
import { LeadDistributionController } from './controllers/lead-distribution.controller';
import { LeadCaptureController } from './controllers/lead-capture.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      LeadActivity,
      LeadScoringRule,
      LeadDistributionRule
    ]),
    UserModule
  ],
  providers: [
    LeadService,
    LeadScoringService,
    LeadDistributionService,
    LeadCaptureService
  ],
  controllers: [
    LeadController,
    LeadScoringController,
    LeadDistributionController,
    LeadCaptureController
  ],
  exports: [
    LeadService,
    LeadScoringService,
    LeadDistributionService,
    LeadCaptureService
  ],
})
export class LeadModule {}
