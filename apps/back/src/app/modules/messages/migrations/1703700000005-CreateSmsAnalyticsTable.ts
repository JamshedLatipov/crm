import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSmsAnalyticsTable1703700000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sms_analytics',
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
            name: 'userId',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'metricType',
            type: 'enum',
            enum: ['sent', 'delivered', 'failed', 'cost', 'response_rate'],
            isNullable: false,
          },
          {
            name: 'value',
            type: 'decimal',
            precision: 15,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'sms_analytics',
      new TableForeignKey({
        columnNames: ['campaignId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sms_campaigns',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'sms_analytics',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'SET NULL',
      })
    );

    // Indexes
    await queryRunner.createIndex(
      'sms_analytics',
      new TableIndex({
        name: 'IDX_sms_analytics_campaign_date',
        columnNames: ['campaignId', 'date'],
      })
    );

    await queryRunner.createIndex(
      'sms_analytics',
      new TableIndex({
        name: 'IDX_sms_analytics_date',
        columnNames: ['date'],
      })
    );

    await queryRunner.createIndex(
      'sms_analytics',
      new TableIndex({
        name: 'IDX_sms_analytics_metricType',
        columnNames: ['metricType'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sms_analytics');
  }
}
