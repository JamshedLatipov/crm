import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddPromoCompanyToDeals1768549680 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Добавляем колонку promoCompanyId в таблицу deals
    await queryRunner.addColumn(
      'deals',
      new TableColumn({
        name: 'promoCompanyId',
        type: 'integer',
        isNullable: true,
      })
    );

    // Добавляем внешний ключ для связи с таблицей promo_companies
    await queryRunner.createForeignKey(
      'deals',
      new TableForeignKey({
        columnNames: ['promoCompanyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'promo_companies',
        onDelete: 'SET NULL', // При удалении промо-компании, устанавливаем NULL в сделках
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Получаем внешний ключ для удаления
    const table = await queryRunner.getTable('deals');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('promoCompanyId') !== -1
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey('deals', foreignKey);
    }

    // Удаляем колонку
    await queryRunner.dropColumn('deals', 'promoCompanyId');
  }
}
