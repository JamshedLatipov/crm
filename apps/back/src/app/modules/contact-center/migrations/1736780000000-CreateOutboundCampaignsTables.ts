import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateOutboundCampaignsTables1736780000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create outbound_campaigns table
    await queryRunner.createTable(
      new Table({
        name: 'outbound_campaigns',
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
            name: 'type',
            type: 'enum',
            enum: ['ivr', 'agent', 'hybrid'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'stopped'],
            default: "'draft'",
          },
          {
            name: 'audio_file_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'audio_file_path',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'queue_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'int',
          },
          {
            name: 'settings',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'paused_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create indexes for outbound_campaigns
    await queryRunner.createIndex(
      'outbound_campaigns',
      new TableIndex({
        name: 'IDX_outbound_campaigns_name',
        columnNames: ['name'],
      })
    );

    await queryRunner.createIndex(
      'outbound_campaigns',
      new TableIndex({
        name: 'IDX_outbound_campaigns_status',
        columnNames: ['status'],
      })
    );

    // Create outbound_campaign_contacts table
    await queryRunner.createTable(
      new Table({
        name: 'outbound_campaign_contacts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'campaign_id',
            type: 'uuid',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'custom_data',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'calling', 'answered', 'busy', 'no_answer', 'failed', 'completed', 'excluded'],
            default: "'pending'",
          },
          {
            name: 'attempts',
            type: 'int',
            default: 0,
          },
          {
            name: 'last_call_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'next_attempt_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes for outbound_campaign_contacts
    await queryRunner.createIndex(
      'outbound_campaign_contacts',
      new TableIndex({
        name: 'IDX_outbound_campaign_contacts_campaign_id',
        columnNames: ['campaign_id'],
      })
    );

    await queryRunner.createIndex(
      'outbound_campaign_contacts',
      new TableIndex({
        name: 'IDX_outbound_campaign_contacts_phone',
        columnNames: ['phone'],
      })
    );

    await queryRunner.createIndex(
      'outbound_campaign_contacts',
      new TableIndex({
        name: 'IDX_outbound_campaign_contacts_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'outbound_campaign_contacts',
      new TableIndex({
        name: 'IDX_outbound_campaign_contacts_next_attempt_at',
        columnNames: ['next_attempt_at'],
      })
    );

    // Create foreign key for campaign_id
    await queryRunner.createForeignKey(
      'outbound_campaign_contacts',
      new TableForeignKey({
        columnNames: ['campaign_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'outbound_campaigns',
        onDelete: 'CASCADE',
      })
    );

    // Create outbound_campaign_calls table
    await queryRunner.createTable(
      new Table({
        name: 'outbound_campaign_calls',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'campaign_id',
            type: 'uuid',
          },
          {
            name: 'contact_id',
            type: 'uuid',
          },
          {
            name: 'call_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'outcome',
            type: 'enum',
            enum: ['answered', 'busy', 'no_answer', 'failed', 'rejected', 'transferred', 'cancelled'],
          },
          {
            name: 'duration',
            type: 'int',
            default: 0,
          },
          {
            name: 'wait_time',
            type: 'int',
            default: 0,
          },
          {
            name: 'answered_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'ended_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'agent_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'recording_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes for outbound_campaign_calls
    await queryRunner.createIndex(
      'outbound_campaign_calls',
      new TableIndex({
        name: 'IDX_outbound_campaign_calls_campaign_id',
        columnNames: ['campaign_id'],
      })
    );

    await queryRunner.createIndex(
      'outbound_campaign_calls',
      new TableIndex({
        name: 'IDX_outbound_campaign_calls_contact_id',
        columnNames: ['contact_id'],
      })
    );

    await queryRunner.createIndex(
      'outbound_campaign_calls',
      new TableIndex({
        name: 'IDX_outbound_campaign_calls_call_id',
        columnNames: ['call_id'],
      })
    );

    await queryRunner.createIndex(
      'outbound_campaign_calls',
      new TableIndex({
        name: 'IDX_outbound_campaign_calls_created_at',
        columnNames: ['created_at'],
      })
    );

    // Create foreign keys for outbound_campaign_calls
    await queryRunner.createForeignKey(
      'outbound_campaign_calls',
      new TableForeignKey({
        columnNames: ['campaign_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'outbound_campaigns',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'outbound_campaign_calls',
      new TableForeignKey({
        columnNames: ['contact_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'outbound_campaign_contacts',
        onDelete: 'CASCADE',
      })
    );

    // Create outbound_campaign_schedules table
    await queryRunner.createTable(
      new Table({
        name: 'outbound_campaign_schedules',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'campaign_id',
            type: 'uuid',
          },
          {
            name: 'day_of_week',
            type: 'int',
          },
          {
            name: 'start_time',
            type: 'time',
          },
          {
            name: 'end_time',
            type: 'time',
          },
          {
            name: 'timezone',
            type: 'varchar',
            length: '100',
            default: "'UTC'",
          },
          {
            name: 'enabled',
            type: 'boolean',
            default: true,
          },
        ],
      }),
      true
    );

    // Create index for outbound_campaign_schedules
    await queryRunner.createIndex(
      'outbound_campaign_schedules',
      new TableIndex({
        name: 'IDX_outbound_campaign_schedules_campaign_id',
        columnNames: ['campaign_id'],
      })
    );

    // Create foreign key for campaign_id
    await queryRunner.createForeignKey(
      'outbound_campaign_schedules',
      new TableForeignKey({
        columnNames: ['campaign_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'outbound_campaigns',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('outbound_campaign_schedules');
    await queryRunner.dropTable('outbound_campaign_calls');
    await queryRunner.dropTable('outbound_campaign_contacts');
    await queryRunner.dropTable('outbound_campaigns');
  }
}
