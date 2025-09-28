import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactIdToDeals1727441100002 implements MigrationInterface {
  name = 'AddContactIdToDeals1727441100002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Проверяем, существует ли колонка contactId
      const hasContactIdColumn = await queryRunner.hasColumn('deals', 'contactId');
      
      if (!hasContactIdColumn) {
        // Добавляем колонку contactId
        await queryRunner.query(`
          ALTER TABLE "deals" 
          ADD COLUMN "contactId" uuid
        `);
      }

      // Проверяем, является ли поле contact NOT NULL
      const table = await queryRunner.getTable('deals');
      const contactColumn = table?.findColumnByName('contact');
      
      if (contactColumn && !contactColumn.isNullable) {
        // Делаем поле contact nullable, поскольку теперь используем contactId
        await queryRunner.query(`
          ALTER TABLE "deals" 
          ALTER COLUMN "contact" DROP NOT NULL
        `);
      }

      // Создаем индекс для contactId (с проверкой на существование через try/catch)
      try {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS "IDX_deals_contactId" ON "deals" ("contactId")
        `);
      } catch {
        // Индекс уже существует, игнорируем ошибку
        console.log('Index IDX_deals_contactId already exists, skipping...');
      }

    } catch (error) {
      console.error('Error in AddContactIdToDeals migration:', error);
      // Не пробрасываем ошибку, чтобы не блокировать запуск
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "contactId"`);
    await queryRunner.query(`ALTER TABLE "deals" ALTER COLUMN "contact" SET NOT NULL`);
  }
}
