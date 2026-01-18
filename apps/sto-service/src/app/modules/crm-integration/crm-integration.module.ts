import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CrmApiService } from './services/crm-api.service';

@Module({
  imports: [HttpModule],
  providers: [CrmApiService],
  exports: [CrmApiService],
})
export class CrmIntegrationModule {}
