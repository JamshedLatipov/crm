import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MetricsService, MetricsMiddleware } from './metrics.service';
import { MetricsController } from './metrics.controller';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware)
      .exclude({ path: 'metrics', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
