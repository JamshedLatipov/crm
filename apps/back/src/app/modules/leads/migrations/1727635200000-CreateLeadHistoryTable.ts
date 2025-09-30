import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateLeadHistoryTable1727635200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: "lead_history",
      columns: [
        {
          name: "id",
          type: "int",
          isPrimary: true,
          isGenerated: true,
          generationStrategy: "increment"
        },
        {
          name: "leadId",
          type: "int",
          isNullable: false
        },
        {
          name: "fieldName",
          type: "varchar",
          length: "255",
          isNullable: true
        },
        {
          name: "oldValue",
          type: "text",
          isNullable: true
        },
        {
          name: "newValue", 
          type: "text",
          isNullable: true
        },
        {
          name: "changeType",
          type: "enum",
          enum: [
            'created',
            'updated', 
            'deleted',
            'status_changed',
            'assigned',
            'scored',
            'qualified',
            'converted',
            'note_added',
            'contact_added',
            'tag_added',
            'tag_removed',
            'follow_up_scheduled'
          ],
          isNullable: false
        },
        {
          name: "userId",
          type: "varchar",
          length: "255",
          isNullable: true
        },
        {
          name: "userName",
          type: "varchar", 
          length: "255",
          isNullable: true
        },
        {
          name: "description",
          type: "text",
          isNullable: true
        },
        {
          name: "metadata",
          type: "json",
          isNullable: true
        },
        {
          name: "createdAt",
          type: "timestamp",
          default: "CURRENT_TIMESTAMP",
          isNullable: false
        }
      ]
    }), true);

    // Создаем индексы для быстрого поиска
    await queryRunner.query(`
      CREATE INDEX "IDX_lead_history_leadId" ON "lead_history" ("leadId");
      CREATE INDEX "IDX_lead_history_changeType" ON "lead_history" ("changeType");
      CREATE INDEX "IDX_lead_history_userId" ON "lead_history" ("userId");
      CREATE INDEX "IDX_lead_history_createdAt" ON "lead_history" ("createdAt");
    `);

    // Создаем внешний ключ к таблице leads
    await queryRunner.query(`
      ALTER TABLE "lead_history" 
      ADD CONSTRAINT "FK_lead_history_leadId" 
      FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем внешний ключ
    await queryRunner.query(`ALTER TABLE "lead_history" DROP CONSTRAINT "FK_lead_history_leadId";`);
    
    // Удаляем индексы
    await queryRunner.query(`
      DROP INDEX "IDX_lead_history_leadId";
      DROP INDEX "IDX_lead_history_changeType";
      DROP INDEX "IDX_lead_history_userId";
      DROP INDEX "IDX_lead_history_createdAt";
    `);
    
    // Удаляем таблицу
    await queryRunner.dropTable("lead_history");
  }
}