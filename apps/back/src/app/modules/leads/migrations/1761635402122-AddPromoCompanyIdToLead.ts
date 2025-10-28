import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPromoCompanyIdToLead1761635402122 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "leads"
            ADD COLUMN "promoCompanyId" integer
        `);

        // Добавляем индекс для производительности
        await queryRunner.query(`
            CREATE INDEX "IDX_leads_promoCompanyId" ON "leads" ("promoCompanyId")
        `);

        // Добавляем внешний ключ
        await queryRunner.query(`
            ALTER TABLE "leads"
            ADD CONSTRAINT "FK_leads_promoCompanyId"
            FOREIGN KEY ("promoCompanyId") REFERENCES "promo_companies"("id") ON DELETE SET NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаляем внешний ключ
        await queryRunner.query(`
            ALTER TABLE "leads" DROP CONSTRAINT "FK_leads_promoCompanyId"
        `);

        // Удаляем индекс
        await queryRunner.query(`
            DROP INDEX "IDX_leads_promoCompanyId"
        `);

        // Удаляем колонку
        await queryRunner.query(`
            ALTER TABLE "leads" DROP COLUMN "promoCompanyId"
        `);
    }

}
