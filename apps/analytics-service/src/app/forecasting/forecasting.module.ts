import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForecastingService } from './forecasting.service';
import { ForecastingController } from './forecasting.controller';
import { Forecast } from './entities/forecast.entity';
import { ForecastPeriod } from './entities/forecast-period.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Forecast, ForecastPeriod])],
  controllers: [ForecastingController],
  providers: [ForecastingService],
  exports: [ForecastingService],
})
export class ForecastingModule {}
