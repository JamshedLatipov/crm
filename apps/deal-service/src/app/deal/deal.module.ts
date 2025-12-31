import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deal } from './entities/deal.entity';
import { DealHistory } from './entities/deal-history.entity';
import { DealService } from './deal.service';
import { DealController } from './deal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Deal, DealHistory])],
  controllers: [DealController],
  providers: [DealService],
  exports: [DealService],
})
export class DealModule {}
