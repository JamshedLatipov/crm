import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAdsIntegration1729945600000 implements MigrationInterface {
  name = 'SeedAdsIntegration1729945600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert two sample ad accounts (facebook and google)
    await queryRunner.query(`
      INSERT INTO "ad_accounts" ("id", "platform", "accountId", "name", "raw", "accessToken", "refreshToken", "tokenExpiresAt", "userId", "createdAt") VALUES
      (1001, 'facebook', 'fb_acc_1001', 'FB Test Account', '{}'::json, null, null, null, null, NOW()),
      (1002, 'google', 'ga_acc_1002', 'Google Test Account', '{}'::json, null, null, null, null, NOW())
    `);

    // Insert two campaigns linked to accounts
    await queryRunner.query(`
      INSERT INTO "ad_campaigns" ("id", "campaignId", "name", "status", "budget", "raw", "accountId", "createdAt") VALUES
      (2001, 'fb_camp_1', 'FB Campaign Alpha', 'active', 1500.00, '{}'::json, 1001, NOW()),
      (2002, 'ga_camp_2', 'Google Campaign Beta', 'active', 800.00, '{}'::json, 1002, NOW())
    `);

    // Insert sample daily metrics for last 5 days for each campaign
    const today = new Date();
    const rows: Array<{ campaign: number; date: string; impressions: number; clicks: number; leads: number; cost: number }> = [];
    for (let d = 5; d >= 1; d--) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - d);
      const iso = dt.toISOString().slice(0, 10);
      rows.push({ campaign: 2001, date: iso, impressions: 1000 + d * 10, clicks: 50 + d, leads: 5 + Math.floor(d / 2), cost: 50 + d * 2 });
      rows.push({ campaign: 2002, date: iso, impressions: 800 + d * 8, clicks: 30 + d, leads: 3 + Math.floor(d / 3), cost: 30 + d * 1.5 });
    }

    for (const r of rows) {
      await queryRunner.query(`
        INSERT INTO "ad_campaign_metrics" ("campaignId", "date", "impressions", "clicks", "leads", "cost", "createdAt") VALUES
        ($1, $2, $3, $4, $5, $6, NOW())
      `, [r.campaign, r.date, r.impressions, r.clicks, r.leads, r.cost]);
    }

    console.log(`Seeded ads accounts (${2}), campaigns (${2}) and metrics (${rows.length})`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "ad_campaign_metrics" WHERE "campaignId" IN (2001,2002)`);
    await queryRunner.query(`DELETE FROM "ad_campaigns" WHERE "id" IN (2001,2002)`);
    await queryRunner.query(`DELETE FROM "ad_accounts" WHERE "id" IN (1001,1002)`);
  }
}
