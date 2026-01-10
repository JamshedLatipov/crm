import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateEmailTemplatesTable1703700000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'email_templates',
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
            name: 'subject',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'htmlContent',
            type: 'text',
          },
          {
            name: 'textContent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'enum',
            enum: ['marketing', 'transactional', 'notification', 'newsletter', 'welcome', 'promotional', 'system', 'other'],
            default: "'other'",
          },
          {
            name: 'variables',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
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
            name: 'totalOpened',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalClicked',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalBounced',
            type: 'int',
            default: 0,
          },
          {
            name: 'totalUnsubscribed',
            type: 'int',
            default: 0,
          },
          {
            name: 'cssStyles',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'preheader',
            type: 'varchar',
            length: '150',
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
      CREATE INDEX idx_email_templates_name ON email_templates(name);
      CREATE INDEX idx_email_templates_category ON email_templates(category);
      CREATE INDEX idx_email_templates_active ON email_templates(isActive);
      CREATE INDEX idx_email_templates_created_at ON email_templates(createdAt);
    `);

    // Внешний ключ на users
    await queryRunner.createForeignKey(
      'email_templates',
      new TableForeignKey({
        columnNames: ['createdById'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('email_templates');
  }
}
