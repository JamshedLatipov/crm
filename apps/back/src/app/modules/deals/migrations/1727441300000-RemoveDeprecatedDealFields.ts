import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDeprecatedDealFields1727441300000 implements MigrationInterface {
  name = 'RemoveDeprecatedDealFields1727441300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Удаляем старые поля, которые теперь заменены связями
      const hasContactIdColumn = await queryRunner.hasColumn('deals', 'contactId');
      if (hasContactIdColumn) {
        await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "contactId"`);
      }

      const hasCompanyIdColumn = await queryRunner.hasColumn('deals', 'companyId');
      if (hasCompanyIdColumn) {
        await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "companyId"`);
      }

      const hasLeadIdColumn = await queryRunner.hasColumn('deals', 'leadId');
      if (hasLeadIdColumn) {
        await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "leadId"`);
      }

      // Удаляем deprecated JSON поле contact
      const hasContactJsonColumn = await queryRunner.hasColumn('deals', 'contact');
      if (hasContactJsonColumn) {
        await queryRunner.query(`ALTER TABLE "deals" DROP COLUMN "contact"`);
      }

      console.log('Removed deprecated fields from deals table');
      
    } catch (error) {
      console.log('Error removing deprecated fields:', error.message);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Восстанавливаем поля при откате
    try {
      await queryRunner.query(`ALTER TABLE "deals" ADD COLUMN "contactId" uuid`);
      await queryRunner.query(`ALTER TABLE "deals" ADD COLUMN "companyId" uuid`);
      await queryRunner.query(`ALTER TABLE "deals" ADD COLUMN "leadId" varchar`);
      await queryRunner.query(`ALTER TABLE "deals" ADD COLUMN "contact" json`);
      
      console.log('Restored deprecated fields to deals table');
    } catch (error) {
      console.log('Error restoring deprecated fields:', error.message);
    }
  }
}
