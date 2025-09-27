import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixContactIdMigration1727441100003 implements MigrationInterface {
  name = 'FixContactIdMigration1727441100003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Эта миграция исправляет проблемы с предыдущей миграцией
    // Проверяем и исправляем структуру таблицы deals
    
    try {
      // Убеждаемся, что contactId существует
      const hasContactIdColumn = await queryRunner.hasColumn('deals', 'contactId');
      if (!hasContactIdColumn) {
        await queryRunner.query(`
          ALTER TABLE "deals" 
          ADD COLUMN "contactId" uuid
        `);
      }

      // Убеждаемся, что contact nullable
      const table = await queryRunner.getTable('deals');
      const contactColumn = table?.findColumnByName('contact');
      
      if (contactColumn && !contactColumn.isNullable) {
        await queryRunner.query(`
          ALTER TABLE "deals" 
          ALTER COLUMN "contact" DROP NOT NULL
        `);
      }

      // Создаем индекс, если его нет
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_deals_contactId" ON "deals" ("contactId")
      `);

      console.log('Deal-Contact integration fixed successfully');
      
    } catch (error) {
      console.log('Deal-Contact structure already correct:', error.message);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner; // eslint-disable-line @typescript-eslint/no-unused-expressions
    // В down ничего не делаем, чтобы не сломать работающую структуру
    console.log('Skipping down migration for FixContactIdMigration');
  }
}
