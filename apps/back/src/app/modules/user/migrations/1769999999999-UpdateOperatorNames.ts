import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Добавляет ФИО для пользователей-операторов
 */
export class UpdateOperatorNames1769999999999 implements MigrationInterface {
  name = 'UpdateOperatorNames1769999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Проверяем наличие колонок firstName и lastName
    const hasFirstName = await this.columnExists(queryRunner, 'users', 'firstName');
    const hasLastName = await this.columnExists(queryRunner, 'users', 'lastName');

    if (hasFirstName && hasLastName) {
      // Обновляем operator2
      await queryRunner.query(`
        UPDATE users 
        SET "firstName" = 'Оператор', "lastName" = '2'
        WHERE username = 'operator2' AND ("firstName" IS NULL OR "firstName" = '');
      `);

      // Обновляем operator3
      await queryRunner.query(`
        UPDATE users 
        SET "firstName" = 'Оператор', "lastName" = '3'
        WHERE username = 'operator3' AND ("firstName" IS NULL OR "firstName" = '');
      `);

      // Обновляем operator4
      await queryRunner.query(`
        UPDATE users 
        SET "firstName" = 'Оператор', "lastName" = '4'
        WHERE username = 'operator4' AND ("firstName" IS NULL OR "firstName" = '');
      `);

      console.log('[Migration] Updated operator names');
    } else {
      console.log('[Migration] firstName/lastName columns not found, skipping');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Откатываем изменения
    await queryRunner.query(`
      UPDATE users 
      SET "firstName" = NULL, "lastName" = NULL
      WHERE username IN ('operator2', 'operator3', 'operator4');
    `);
  }

  private async columnExists(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const result = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='${column}' LIMIT 1;`
    );
    return result.length > 0;
  }
}
