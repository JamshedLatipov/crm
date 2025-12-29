import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSmsMessagesTable1703700000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sms_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'campaignId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'contactId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'leadId',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'direction',
            type: 'enum',
            enum: ['outbound', 'inbound'],
            default: "'outbound'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'queued', 'sending', 'sent', 'delivered', 'failed', 'rejected', 'expired'],
            default: "'pending'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'cost',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 0,
          },
          {
            name: 'segmentsCount',
            type: 'integer',
            default: 1,
          },
          {
            name: 'queuedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sentAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'deliveredAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failedAt',
            type: 'timestamp',
            isNullable: true,
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

    // Foreign keys
    await queryRunner.createForeignKey(
      'sms_messages',
      new TableForeignKey({
        columnNames: ['campaignId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sms_campaigns',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'sms_messages',
      new TableForeignKey({
        columnNames: ['contactId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'contacts',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'sms_messages',
      new TableForeignKey({
        columnNames: ['leadId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'leads',
        onDelete: 'SET NULL',
      })
    );

    // Indexes
    await queryRunner.createIndex(
      'sms_messages',
      new TableIndex({
        name: 'IDX_sms_messages_campaign_status',
        columnNames: ['campaignId', 'status'],
      })
    );

    await queryRunner.createIndex(
      'sms_messages',
      new TableIndex({
        name: 'IDX_sms_messages_phoneNumber',
        columnNames: ['phoneNumber'],
      })
    );

    await queryRunner.createIndex(
      'sms_messages',
      new TableIndex({
        name: 'IDX_sms_messages_createdAt',
        columnNames: ['createdAt'],
      })
    );

    await queryRunner.createIndex(
      'sms_messages',
      new TableIndex({
        name: 'IDX_sms_messages_status',
        columnNames: ['status'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sms_messages');
  }
}
