import { Injectable, Logger, Inject, Optional, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

/**
 * User Client Adapter for monolith-to-microservice transition
 * 
 * This service acts as a facade that can route user operations to either:
 * - Local UserService (current behavior)
 * - Identity Service via RabbitMQ (microservice mode)
 * 
 * Controlled by environment variable: USE_IDENTITY_SERVICE=true
 */
@Injectable()
export class UserClientAdapter implements OnModuleInit {
  private readonly logger = new Logger(UserClientAdapter.name);
  private useIdentityService = false;
  private connected = false;

  constructor(
    @Optional() @Inject('IDENTITY_SERVICE')
    private readonly identityClient: ClientProxy | null,
  ) {
    this.useIdentityService = process.env['USE_IDENTITY_SERVICE'] === 'true';
  }

  async onModuleInit() {
    if (this.useIdentityService && this.identityClient) {
      try {
        await this.identityClient.connect();
        this.connected = true;
        this.logger.log('✅ Connected to Identity Service (microservice mode)');
      } catch (error) {
        this.logger.error('❌ Failed to connect to Identity Service, falling back to local', error);
        this.useIdentityService = false;
      }
    } else {
      this.logger.log('📦 Using local UserService (monolith mode)');
    }
  }

  isUsingMicroservice(): boolean {
    return this.useIdentityService && this.connected;
  }

  /**
   * Send RPC request to Identity Service
   */
  async send<T>(pattern: string, data: unknown): Promise<T | null> {
    if (!this.identityClient || !this.connected) {
      return null;
    }

    try {
      return await firstValueFrom(
        this.identityClient.send<T>(pattern, data).pipe(
          timeout(5000),
          catchError((error) => {
            this.logger.error(`RPC call failed: ${pattern}`, error);
            return of(null);
          }),
        ),
      );
    } catch (error) {
      this.logger.error(`RPC call error: ${pattern}`, error);
      return null;
    }
  }

  /**
   * Emit event to Identity Service (fire-and-forget)
   */
  emit(pattern: string, data: unknown): void {
    if (this.identityClient && this.connected) {
      this.identityClient.emit(pattern, data);
    }
  }
}
