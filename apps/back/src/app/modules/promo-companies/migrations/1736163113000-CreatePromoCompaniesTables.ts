import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePromoCompaniesTables1736163113000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаем таблицу promo_companies
    await queryRunner.createTable(new Table({
      name: "promo_companies",
      columns: [
        {
          name: "id",
          type: "int",
          isPrimary: true,
          isGenerated: true,
          generationStrategy: "increment"
        },
        {
          name: "name",
          type: "varchar",
          length: "255",
          isNullable: false
        },
        {
          name: "description",
          type: "text",
          isNullable: true
        },
        {
          name: "type",
          type: "enum",
          enum: ['promoter', 'affiliate', 'partner'],
          default: "'promoter'",
          isNullable: false
        },
        {
          name: "status",
          type: "enum",
          enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
          default: "'draft'",
          isNullable: false
        },
        {
          name: "budget",
          type: "decimal",
          precision: 10,
          scale: 2,
          isNullable: true
        },
        {
          name: "spent",
          type: "decimal",
          precision: 10,
          scale: 2,
          isNullable: true
        },
        {
          name: "startDate",
          type: "timestamp",
          isNullable: true
        },
        {
          name: "endDate",
          type: "timestamp",
          isNullable: true
        },
        {
          name: "targetCriteria",
          type: "json",
          isNullable: true
        },
        {
          name: "leadsReached",
          type: "int",
          default: 0,
          isNullable: false
        },
        {
          name: "leadsConverted",
          type: "int",
          default: 0,
          isNullable: false
        },
        {
          name: "notes",
          type: "text",
          isNullable: true
        },
        {
          name: "createdAt",
          type: "timestamp",
          default: "CURRENT_TIMESTAMP",
          isNullable: false
        },
        {
          name: "updatedAt",
          type: "timestamp",
          default: "CURRENT_TIMESTAMP",
          onUpdate: "CURRENT_TIMESTAMP",
          isNullable: false
        }
      ]
    }), true);

    // Создаем таблицу promo_company_leads для ManyToMany связи
    await queryRunner.createTable(new Table({
      name: "promo_company_leads",
      columns: [
        {
          name: "promoCompanyId",
          type: "int",
          isNullable: false
        },
        {
          name: "leadId",
          type: "int",
          isNullable: false
        }
      ]
    }), true);

    // Создаем индексы
    await queryRunner.query(`
      CREATE INDEX "IDX_promo_company_leads_promoCompanyId" ON "promo_company_leads" ("promoCompanyId");
      CREATE INDEX "IDX_promo_company_leads_leadId" ON "promo_company_leads" ("leadId");
    `);

    // Создаем композитный первичный ключ
    await queryRunner.query(`
      ALTER TABLE "promo_company_leads" 
      ADD CONSTRAINT "PK_promo_company_leads" 
      PRIMARY KEY ("promoCompanyId", "leadId");
    `);

    // Создаем внешние ключи
    await queryRunner.query(`
      ALTER TABLE "promo_company_leads" 
      ADD CONSTRAINT "FK_promo_company_leads_promoCompanyId" 
      FOREIGN KEY ("promoCompanyId") REFERENCES "promo_companies"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "promo_company_leads" 
      ADD CONSTRAINT "FK_promo_company_leads_leadId" 
      FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем внешние ключи
    await queryRunner.query(`ALTER TABLE "promo_company_leads" DROP CONSTRAINT "FK_promo_company_leads_leadId";`);
    await queryRunner.query(`ALTER TABLE "promo_company_leads" DROP CONSTRAINT "FK_promo_company_leads_promoCompanyId";`);

    // Удаляем индексы
    await queryRunner.query(`
      DROP INDEX "IDX_promo_company_leads_promoCompanyId";
      DROP INDEX "IDX_promo_company_leads_leadId";
    `);

    // Удаляем таблицы
    await queryRunner.dropTable("promo_company_leads");
    await queryRunner.dropTable("promo_companies");
  }
}