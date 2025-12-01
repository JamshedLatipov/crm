import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedBankingIntegrationWithUI1732900000003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // First delete the old config to replace it with the new one
        await queryRunner.query(`DELETE FROM "integration_config" WHERE "name" = 'Banking Integration'`);

        const config = {
            name: "Banking Integration",
            isActive: true,
            sources: [
                {
                    key: "profile",
                    urlTemplate: "http://10.1.3.85:7553/customerOapi/by-phone/{{phone}}",
                    method: "GET",
                    mapping: {
                        "name": "MUSTERI_ADI",
                        "phone": "TELEFON"
                    },
                    ui: {
                        type: "details",
                        title: "Профиль клиента",
                        fields: [
                            { key: "MUSTERI_ADI", label: "Имя" },
                            { key: "MUSTERI_SOYADI", label: "Фамилия" },
                            { key: "TELEFON", label: "Телефон" },
                            { key: "CUSTOMER_NO", label: "Номер клиента" }
                        ]
                    }
                },
                {
                    key: "loans",
                    urlTemplate: "http://10.1.3.85:7555/loanOapi/by-phone/{{phone}}",
                    method: "GET",
                    isList: true,
                    ui: {
                        type: "table",
                        title: "Кредиты",
                        columns: [
                            { key: "contractNo", label: "№ Договора" },
                            { key: "contractAmount", label: "Сумма" },
                            { key: "currencyRate", label: "Валюта" },
                            { key: "loanStatusForBr", label: "Статус" }
                        ]
                    }
                },
                {
                    key: "deposits",
                    urlTemplate: "http://10.1.3.85:7554/depositOapi/by-phone/{{phone}}",
                    method: "GET",
                    isList: true,
                    ui: {
                        type: "table",
                        title: "Депозиты",
                        columns: [
                            { key: "contractNo", label: "№ Договора" },
                            { key: "contractAmount", label: "Сумма" },
                            { key: "rate", label: "Ставка %" },
                            { key: "endDate", label: "Дата окончания" }
                        ]
                    }
                },
                {
                    key: "accounts",
                    urlTemplate: "http://10.1.3.85:7552/accountOapi/by-phone/{{phone}}",
                    method: "GET",
                    isList: true,
                    ui: {
                        type: "table",
                        title: "Счета",
                        columns: [
                            { key: "accountNo", label: "Номер счета" },
                            { key: "balance", label: "Баланс" },
                            { key: "productName", label: "Продукт" }
                        ]
                    }
                }
            ]
        };

        await queryRunner.query(`
            INSERT INTO "integration_config" ("name", "isActive", "sources")
            VALUES ($1, $2, $3)
        `, [config.name, config.isActive, JSON.stringify(config.sources)]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "integration_config" WHERE "name" = 'Banking Integration'`);
    }
}
