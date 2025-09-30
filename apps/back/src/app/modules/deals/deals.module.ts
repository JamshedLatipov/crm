import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { Deal } from './deal.entity';
import { DealHistory } from './entities/deal-history.entity';
import { DealHistoryService } from './services/deal-history.service';
import { DealHistoryController } from './controllers/deal-history.controller';
import { PipelineStage } from '../pipeline/pipeline.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deal, DealHistory, PipelineStage]),
    PassportModule,
    UserModule
  ],
  providers: [DealsService, DealHistoryService],
  controllers: [DealsController, DealHistoryController],
  exports: [DealsService, DealHistoryService],
})
export class DealsModule {}
