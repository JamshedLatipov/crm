import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { LeadService } from './lead.service';
import { LeadController } from './lead.controller';
// Scoring
import { LeadScoringRule } from './entities/lead-scoring-rule.entity';
import { LeadScore } from './entities/lead-score.entity';
import { LeadScoringController } from './scoring/lead-scoring.controller';
import { LeadScoringService } from './scoring/lead-scoring.service';
// Distribution
import { LeadDistributionRule } from './entities/lead-distribution-rule.entity';
import { LeadDistributionController } from './distribution/lead-distribution.controller';
import { LeadDistributionService } from './distribution/lead-distribution.service';
// Capture
import { LeadCapture } from './entities/lead-capture.entity';
import { LeadCaptureConfig } from './entities/lead-capture-config.entity';
import { LeadCaptureController } from './capture/lead-capture.controller';
import { LeadCaptureService } from './capture/lead-capture.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      LeadScoringRule,
      LeadScore,
      LeadDistributionRule,
      LeadCapture,
      LeadCaptureConfig,
    ]),
  ],
  controllers: [
    LeadController,
    LeadScoringController,
    LeadDistributionController,
    LeadCaptureController,
  ],
  providers: [
    LeadService,
    LeadScoringService,
    LeadDistributionService,
    LeadCaptureService,
  ],
  exports: [
    LeadService,
    LeadScoringService,
    LeadDistributionService,
    LeadCaptureService,
  ],
})
export class LeadModule {}
