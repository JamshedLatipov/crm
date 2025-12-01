import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedBankingIntegration1732900000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
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
                    }
                },
                {
                    key: "loans",
                    urlTemplate: "http://10.1.3.85:7555/loanOapi/by-phone/{{phone}}",
                    method: "GET",
                    isList: true
                },
                {
                    key: "deposits",
                    urlTemplate: "http://10.1.3.85:7554/depositOapi/by-phone/{{phone}}",
                    method: "GET",
                    isList: true
                },
                {
                    key: "accounts",
                    urlTemplate: "http://10.1.3.85:7552/accountOapi/by-phone/{{phone}}",
                    method: "GET",
                    isList: true
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
