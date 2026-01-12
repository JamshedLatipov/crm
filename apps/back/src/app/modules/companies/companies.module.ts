import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { CompaniesService } from './services/companies.service';
import { CompaniesController } from './controllers/companies.controller';
import { CustomFieldsModule } from '../custom-fields/custom-fields.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([Company]), CustomFieldsModule, SharedModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService, TypeOrmModule],
})
export class CompaniesModule {}
