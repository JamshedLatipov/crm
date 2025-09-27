import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateContactsTable1727441100000 implements MigrationInterface {
  name = 'CreateContactsTable1727441100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'contacts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['person', 'company'],
            default: "'person'",
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'firstName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'lastName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'middleName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'position',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'company',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'mobilePhone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'workPhone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'website',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'socialMedia',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'source',
            type: 'enum',
            enum: ['website', 'phone', 'email', 'referral', 'social_media', 'advertising', 'import', 'other'],
            default: "'other'",
          },
          {
            name: 'assignedTo',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'customFields',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isBlacklisted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'blacklistReason',
            type: 'text',
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
          {
            name: 'lastContactDate',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Создаем индексы
    await queryRunner.createIndex('contacts', new TableIndex({
      name: 'IDX_contacts_email',
      columnNames: ['email']
    }));

    await queryRunner.createIndex('contacts', new TableIndex({
      name: 'IDX_contacts_phone',
      columnNames: ['phone']
    }));

    await queryRunner.createIndex('contacts', new TableIndex({
      name: 'IDX_contacts_company',
      columnNames: ['company']
    }));

    await queryRunner.createIndex('contacts', new TableIndex({
      name: 'IDX_contacts_assignedTo',
      columnNames: ['assignedTo']
    }));

    await queryRunner.createIndex('contacts', new TableIndex({
      name: 'IDX_contacts_type',
      columnNames: ['type']
    }));

    await queryRunner.createIndex('contacts', new TableIndex({
      name: 'IDX_contacts_source',
      columnNames: ['source']
    }));

    await queryRunner.createIndex('contacts', new TableIndex({
      name: 'IDX_contacts_isActive',
      columnNames: ['isActive']
    }));

    await queryRunner.createIndex('contacts', new TableIndex({
      name: 'IDX_contacts_lastContactDate',
      columnNames: ['lastContactDate']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('contacts');
  }
}
