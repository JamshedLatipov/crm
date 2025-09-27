import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDealsTable1727441000000 implements MigrationInterface {
  name = 'CreateDealsTable1727441000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'deals',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'title',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'leadId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'contact',
            type: 'json',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            default: "'RUB'",
          },
          {
            name: 'probability',
            type: 'int',
            default: 50,
          },
          {
            name: 'expectedCloseDate',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'actualCloseDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'stageId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['open', 'won', 'lost'],
            default: "'open'",
          },
          {
            name: 'assignedTo',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'meta',
            type: 'json',
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
        foreignKeys: [
          {
            name: 'FK_deals_stage',
            columnNames: ['stageId'],
            referencedTableName: 'pipeline_stages',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true,
    );

    // Создаем индексы для оптимизации запросов
    await queryRunner.createIndex('deals', new TableIndex({
      name: 'IDX_deals_stageId',
      columnNames: ['stageId']
    }));

    await queryRunner.createIndex('deals', new TableIndex({
      name: 'IDX_deals_assignedTo', 
      columnNames: ['assignedTo']
    }));

    await queryRunner.createIndex('deals', new TableIndex({
      name: 'IDX_deals_status',
      columnNames: ['status']
    }));

    await queryRunner.createIndex('deals', new TableIndex({
      name: 'IDX_deals_expectedCloseDate',
      columnNames: ['expectedCloseDate']
    }));

    await queryRunner.createIndex('deals', new TableIndex({
      name: 'IDX_deals_createdAt',
      columnNames: ['createdAt']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('deals');
  }
}
