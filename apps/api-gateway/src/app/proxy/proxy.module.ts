import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';

/**
 * Proxy Module - Routes requests to monolith during migration
 * 
 * This module proxies requests to the legacy monolith for services
 * that haven't been extracted to microservices yet.
 */
@Module({
  controllers: [ProxyController],
})
export class ProxyModule {}
