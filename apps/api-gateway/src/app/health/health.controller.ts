import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { SERVICES, IDENTITY_PATTERNS } from '@crm/contracts';

interface ServiceHealth {
  name: string;
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
}

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(SERVICES.IDENTITY) private readonly identityClient: ClientProxy,
  ) {}

  @Get()
  async check() {
    const services = await this.checkAllServices();
    const allUp = services.every(s => s.status === 'up');
    
    return {
      status: allUp ? 'ok' : 'degraded',
      gateway: 'api-gateway',
      timestamp: new Date().toISOString(),
      services,
    };
  }

  @Get('ready')
  async ready() {
    // Check if at least identity service is available
    const identityHealth = await this.checkService(
      SERVICES.IDENTITY,
      this.identityClient,
      IDENTITY_PATTERNS.HEALTH_CHECK
    );
    
    return {
      status: identityHealth.status === 'up' ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  live() {
    return {
      status: 'live',
      gateway: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  private async checkAllServices(): Promise<ServiceHealth[]> {
    const checks: Promise<ServiceHealth>[] = [
      this.checkService(SERVICES.IDENTITY, this.identityClient, IDENTITY_PATTERNS.HEALTH_CHECK),
      // Add more services as they become available
    ];

    return Promise.all(checks);
  }

  private async checkService(
    name: string,
    client: ClientProxy,
    pattern: string
  ): Promise<ServiceHealth> {
    const start = Date.now();
    
    try {
      await firstValueFrom(
        client.send(pattern, {}).pipe(
          timeout(3000),
          catchError(err => {
            throw err;
          })
        )
      );
      
      return {
        name,
        status: 'up',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      this.logger.warn(`Service ${name} health check failed:`, error);
      return {
        name,
        status: 'down',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
