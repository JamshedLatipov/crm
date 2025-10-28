import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCompaniesService } from './services/promo-companies.service';
import { PromoCompaniesController } from './controllers/promo-companies.controller';
import { PromoCompany } from './entities/promo-company.entity';
import { Lead } from '../leads/lead.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PromoCompany, Lead])],
  controllers: [PromoCompaniesController],
  providers: [PromoCompaniesService],
  exports: [PromoCompaniesService],
})
export class PromoCompaniesModule {}