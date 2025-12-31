// Identity Service Client
// Used by other services to communicate with Identity Service via RabbitMQ
export * from './identity-client.module';
export * from './identity-client.service';

// Audit Service Client
// Used by other services to send audit logs
export * from './audit-client.module';
export * from './audit-client.service';
