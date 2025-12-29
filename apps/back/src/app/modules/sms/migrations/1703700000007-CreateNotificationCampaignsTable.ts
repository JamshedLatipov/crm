import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateNotificationCampaignsTable1703700000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notification_campaigns',
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
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'channels',
            type: 'varchar',
            isArray: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['immediate', 'scheduled', 'triggered', 'recurring'],
            default: "'immediate'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'failed', 'cancelled'],
            default: "'draft'",
          },
          {
            name: 'settings',
            type: 'jsonb',
          },
          {
            name: 'channelStats',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'totalRecipients',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalSent',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalDelivered',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalFailed',
            type: 'int',
            default: 0,
          },
          {
            name: 'scheduledAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'segmentId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'smsTemplateId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'emailTemplateId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdById',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Индексы
    await queryRunner.query(`
      CREATE INDEX idx_notification_campaigns_name ON notification_campaigns(name);
      CREATE INDEX idx_notification_campaigns_type ON notification_campaigns(type);
      CREATE INDEX idx_notification_campaigns_status ON notification_campaigns(status);
      CREATE INDEX idx_notification_campaigns_channels ON notification_campaigns USING GIN (channels);
      CREATE INDEX idx_notification_campaigns_scheduled_at ON notification_campaigns(scheduledAt);
      CREATE INDEX idx_notification_campaigns_created_at ON notification_campaigns(createdAt);
    `);

    // Внешние ключи
    await queryRunner.createForeignKey(
      'notification_campaigns',
      new TableForeignKey({
        columnNames: ['segmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sms_segments',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'notification_campaigns',
      new TableForeignKey({
        columnNames: ['smsTemplateId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sms_templates',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'notification_campaigns',
      new TableForeignKey({
        columnNames: ['emailTemplateId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'email_templates',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'notification_campaigns',
      new TableForeignKey({
        columnNames: ['createdById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notification_campaigns');
  }
}
