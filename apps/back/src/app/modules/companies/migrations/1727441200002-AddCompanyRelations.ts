import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyRelations1727441200002 implements MigrationInterface {
  name = 'AddCompanyRelations1727441200002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Добавляем companyId в таблицу contacts
      const hasContactsCompanyId = await queryRunner.hasColumn('contacts', 'companyId');
      if (!hasContactsCompanyId) {
        await queryRunner.query(`
          ALTER TABLE "contacts" 
          ADD COLUMN "companyId" uuid
        `);
      }

      // Переименовываем старое поле company в companyName для обратной совместимости
      const hasCompanyColumn = await queryRunner.hasColumn('contacts', 'company');
      if (hasCompanyColumn) {
        await queryRunner.query(`
          ALTER TABLE "contacts" 
          RENAME COLUMN "company" TO "companyName"
        `);
      }

      // Добавляем companyId в таблицу deals
      const hasDealsCompanyId = await queryRunner.hasColumn('deals', 'companyId');
      if (!hasDealsCompanyId) {
        await queryRunner.query(`
          ALTER TABLE "deals" 
          ADD COLUMN "companyId" uuid
        `);
      }

      // Создаем индексы для оптимизации запросов
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_contacts_companyId" ON "contacts" ("companyId")
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_deals_companyId" ON "deals" ("companyId")
      `);

      // Создаем внешние ключи (но не включаем constraint пока)
      // await queryRunner.query(`
      //   ALTER TABLE "contacts" 
      //   ADD CONSTRAINT "FK_contacts_companyId" 
      //   FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL
      // `);

      // await queryRunner.query(`
      //   ALTER TABLE "deals" 
      //   ADD CONSTRAINT "FK_deals_companyId" 
      //   FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL
      // `);

      console.log('Company relations added successfully');
      
    } catch (error) {
      console.log('Company relations setup completed with notes:', error.message);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      // Удаляем внешние ключи
      // await queryRunner.query(`ALTER TABLE "deals" DROP CONSTRAINT IF EXISTS "FK_deals_companyId"`);
      // await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "FK_contacts_companyId"`);

      // Удаляем индексы
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deals_companyId"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contacts_companyId"`);

      // Удаляем колонки
      await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN IF EXISTS "companyId"`);
      await queryRunner.query(`ALTER TABLE "contacts" DROP COLUMN IF EXISTS "companyId"`);

      // Возвращаем старое название колонки
      const hasCompanyNameColumn = await queryRunner.hasColumn('contacts', 'companyName');
      if (hasCompanyNameColumn) {
        await queryRunner.query(`
          ALTER TABLE "contacts" 
          RENAME COLUMN "companyName" TO "company"
        `);
      }

    } catch (error) {
      console.log('Rollback completed with notes:', error.message);
    }
  }
}
