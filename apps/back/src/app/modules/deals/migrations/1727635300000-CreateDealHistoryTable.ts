import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateDealHistoryTable1727635300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: "deal_history",
      columns: [
        {
          name: "id",
          type: "int",
          isPrimary: true,
          isGenerated: true,
          generationStrategy: "increment"
        },
        {
          name: "dealId",
          type: "uuid",
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
            'stage_moved',
            'assigned',
            'amount_changed',
            'probability_changed',
            'won',
            'lost',
            'reopened',
            'note_added',
            'contact_linked',
            'company_linked',
            'lead_linked',
            'date_changed'
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
      CREATE INDEX "IDX_deal_history_dealId" ON "deal_history" ("dealId");
      CREATE INDEX "IDX_deal_history_changeType" ON "deal_history" ("changeType");
      CREATE INDEX "IDX_deal_history_userId" ON "deal_history" ("userId");
      CREATE INDEX "IDX_deal_history_createdAt" ON "deal_history" ("createdAt");
    `);

    // Создаем внешний ключ к таблице deals
    await queryRunner.query(`
      ALTER TABLE "deal_history" 
      ADD CONSTRAINT "FK_deal_history_dealId" 
      FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем внешний ключ
    await queryRunner.query(`ALTER TABLE "deal_history" DROP CONSTRAINT "FK_deal_history_dealId";`);
    
    // Удаляем индексы
    await queryRunner.query(`
      DROP INDEX "IDX_deal_history_dealId";
      DROP INDEX "IDX_deal_history_changeType";
      DROP INDEX "IDX_deal_history_userId";
      DROP INDEX "IDX_deal_history_createdAt";
    `);
    
    // Удаляем таблицу
    await queryRunner.dropTable("deal_history");
  }
}