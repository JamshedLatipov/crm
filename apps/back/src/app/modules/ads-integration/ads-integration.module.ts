import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdsIntegrationService } from './ads-integration.service';
import { AdsIntegrationController } from './ads-integration.controller';
import { AdLeadRecord } from './entities/ad-lead-record.entity';
import { AdAccount } from './entities/ad-account.entity';
import { AdCampaign } from './entities/ad-campaign.entity';
import { AdCampaignMetric } from './entities/ad-campaign-metric.entity';
import { LeadModule } from '../leads/lead.module';
import { WebhookGuard } from './guards/webhook.guard';
import { AdsSyncService } from './ads-sync.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdLeadRecord, AdAccount, AdCampaign, AdCampaignMetric]), forwardRef(() => LeadModule)],
  providers: [AdsIntegrationService, AdsSyncService, WebhookGuard],
  controllers: [AdsIntegrationController],
  exports: [AdsIntegrationService, AdsSyncService]
})
export class AdsIntegrationModule {}
