import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueProducerService } from './queue-producer.service';

// Re-export for backward compatibility
export { QUEUE_NAMES } from './queue.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [QueueProducerService],
  exports: [QueueProducerService],
})
export class QueuesModule {}
