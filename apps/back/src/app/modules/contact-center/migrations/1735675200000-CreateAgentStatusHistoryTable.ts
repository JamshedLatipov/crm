import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAgentStatusHistoryTable1735675200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'agent_status_history',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'extension',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'full_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'previous_status',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'queue_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'status_changed_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.createIndex(
      'agent_status_history',
      new TableIndex({
        name: 'IDX_agent_status_history_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'agent_status_history',
      new TableIndex({
        name: 'IDX_agent_status_history_extension',
        columnNames: ['extension'],
      }),
    );

    await queryRunner.createIndex(
      'agent_status_history',
      new TableIndex({
        name: 'IDX_agent_status_history_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'agent_status_history',
      new TableIndex({
        name: 'IDX_agent_status_history_status_changed_at',
        columnNames: ['status_changed_at'],
      }),
    );

    // Composite index for common queries
    await queryRunner.createIndex(
      'agent_status_history',
      new TableIndex({
        name: 'IDX_agent_status_history_ext_date',
        columnNames: ['extension', 'status_changed_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('agent_status_history');
  }
}
