import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PipelineService } from './pipeline.service';

@Injectable()
export class AutomationService implements OnModuleInit, OnModuleDestroy {
  private interval: NodeJS.Timeout | null = null;
  private readonly logger = new Logger(AutomationService.name);

  constructor(private svc: PipelineService) {}

  onModuleInit() {
    // run every 60s
    this.interval = setInterval(() => {
      this.svc.processAutomation().catch((e) => this.logger.error('Automation error', e as any));
    }, 60_000);
    this.logger.log('AutomationService started');
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
    this.logger.log('AutomationService stopped');
  }
}
