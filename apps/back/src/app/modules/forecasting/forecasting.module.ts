import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Forecast, ForecastPeriod } from './entities';
import { ForecastingService } from './forecasting.service';
import { ForecastingController } from './forecasting.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Forecast, ForecastPeriod]),
  ],
  controllers: [ForecastingController],
  providers: [ForecastingService],
  exports: [ForecastingService],
})
export class ForecastingModule {}
