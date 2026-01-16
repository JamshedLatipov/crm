import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSmsProviderConfigs1737000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sms_provider_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'displayName',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: false,
          },
          {
            name: 'config',
            type: 'jsonb',
          },
          {
            name: 'webhookConfig',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Добавляем индекс на isActive для быстрого поиска активного провайдера
    await queryRunner.query(`
      CREATE INDEX idx_sms_provider_configs_active 
      ON sms_provider_configs (isActive) 
      WHERE isActive = true
    `);

    // Вставляем дефолтную конфигурацию для IMON.TJ
    await queryRunner.query(`
      INSERT INTO sms_provider_configs (name, "displayName", "isActive", config, "webhookConfig", settings)
      VALUES (
        'imon_tj',
        'IMON.TJ SMS Service',
        false,
        '{
          "baseUrl": "https://sms-service.imon.tj",
          "authType": "custom",
          "endpoints": {
            "send": "/api/sms/send"
          },
          "credentials": {
            "loginEnv": "IMON_TJ_LOGIN",
            "passwordEnv": "IMON_TJ_PASSWORD"
          },
          "fieldMapping": {
            "phone": "telephone",
            "message": "sms",
            "login": "login",
            "password": "password"
          },
          "requestFormat": "json",
          "requestMethod": "POST",
          "responseMapping": {
            "messageIdField": "smsID",
            "successField": "message",
            "errorField": "error"
          },
          "customLogic": {
            "md5Password": true,
            "phoneFormat": "+992XXXXXXXXX"
          }
        }'::jsonb,
        '{
          "enabled": false
        }'::jsonb,
        '{
          "timeout": 10000,
          "maxRetries": 3,
          "costPerMessage": 0.05
        }'::jsonb
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sms_provider_configs');
  }
}
