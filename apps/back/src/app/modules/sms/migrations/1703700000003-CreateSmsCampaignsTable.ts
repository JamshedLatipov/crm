import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSmsCampaignsTable1703700000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sms_campaigns',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'templateId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'segmentId',
            type: 'uuid',
            isNullable: true,
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
            enum: ['draft', 'scheduled', 'sending', 'completed', 'paused', 'cancelled', 'failed'],
            default: "'draft'",
          },
          {
            name: 'settings',
            type: 'jsonb',
            isNullable: true,
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
            name: 'pausedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'totalRecipients',
            type: 'integer',
            default: 0,
          },
          {
            name: 'sentCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'deliveredCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'failedCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'pendingCount',
            type: 'integer',
            default: 0,
          },
          {
            name: 'totalCost',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 0,
          },
          {
            name: 'estimatedCost',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 0,
          },
          {
            name: 'completionPercentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'createdById',
            type: 'integer',
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
      'sms_campaigns',
      new TableForeignKey({
        columnNames: ['templateId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sms_templates',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'sms_campaigns',
      new TableForeignKey({
        columnNames: ['segmentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'sms_segments',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'sms_campaigns',
      new TableForeignKey({
        columnNames: ['createdById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'user',
        onDelete: 'SET NULL',
      })
    );

    // Indexes
    await queryRunner.createIndex(
      'sms_campaigns',
      new TableIndex({
        name: 'IDX_sms_campaigns_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'sms_campaigns',
      new TableIndex({
        name: 'IDX_sms_campaigns_type',
        columnNames: ['type'],
      })
    );

    await queryRunner.createIndex(
      'sms_campaigns',
      new TableIndex({
        name: 'IDX_sms_campaigns_scheduledAt',
        columnNames: ['scheduledAt'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sms_campaigns');
  }
}
