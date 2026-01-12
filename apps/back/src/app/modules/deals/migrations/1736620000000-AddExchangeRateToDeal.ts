import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddExchangeRateToDeal1736620000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'deals',
      new TableColumn({
        name: 'exchangeRate',
        type: 'decimal',
        precision: 10,
        scale: 6,
        isNullable: true,
        comment: 'Курс валюты к RUB на момент создания/завершения сделки',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('deals', 'exchangeRate');
  }
}
