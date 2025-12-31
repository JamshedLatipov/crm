import { ConfigService } from '@nestjs/config';

/**
 * Build RabbitMQ connection URL from environment variables
 * 
 * Supported env vars:
 * - RMQ_URL: Full connection URL (takes priority if set)
 * - RMQ_HOST: Host (default: localhost)
 * - RMQ_PORT: Port (default: 5672)
 * - RMQ_USER: Username (default: guest)
 * - RMQ_PASS: Password (default: guest)
 * - RMQ_VHOST: Virtual host (default: /)
 */
export function getRabbitMqUrl(configService: ConfigService): string {
  // If full URL is provided, use it directly
  const fullUrl = configService.get<string>('RMQ_URL');
  if (fullUrl) {
    return fullUrl;
  }

  // Otherwise build from individual components
  const host = configService.get<string>('RMQ_HOST', 'localhost');
  const port = configService.get<number>('RMQ_PORT', 5672);
  const user = configService.get<string>('RMQ_USER', 'guest');
  const pass = configService.get<string>('RMQ_PASS', 'guest');
  const vhost = configService.get<string>('RMQ_VHOST', '/');

  const encodedVhost = vhost === '/' ? '' : `/${encodeURIComponent(vhost)}`;
  return `amqp://${user}:${pass}@${host}:${port}${encodedVhost}`;
}
