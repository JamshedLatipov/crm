import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDeprecatedDealFields1727441300000 implements MigrationInterface {
  name = 'RemoveDeprecatedDealFields1727441300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // НЕ удаляем contactId и companyId - они нужны для связей!
      // Удаляем только старые поля, которые действительно не нужны
      
      // Удаляем deprecated JSON поле contact (заменено на связь)
      const hasContactJsonColumn = await queryRunner.hasColumn('deals', 'contact');
      if (hasContactJsonColumn) {
        await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "contact"`);
      }

      console.log('Removed only deprecated JSON contact field from deals table');
      
    } catch (error) {
      console.log('Error removing deprecated fields:', error.message);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Восстанавливаем только JSON поле contact при откате
    try {
      await queryRunner.query(`ALTER TABLE "deals" ADD COLUMN "contact" json`);
      
      console.log('Restored JSON contact field to deals table');
    } catch (error) {
      console.log('Error restoring contact field:', error.message);
    }
  }
}
