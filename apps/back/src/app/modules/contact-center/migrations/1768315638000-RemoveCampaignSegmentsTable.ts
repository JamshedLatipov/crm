import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to remove campaign_segments table
 * CampaignSegment entity was removed in favor of using universal ContactSegment
 * with usageType = 'campaign' for better code reusability
 */
export class RemoveCampaignSegmentsTable1768315638000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists before dropping
    const tableExists = await queryRunner.hasTable('campaign_segments');
    
    if (tableExists) {
      // Drop the campaign_segments table
      await queryRunner.query(`DROP TABLE IF EXISTS "campaign_segments" CASCADE;`);
      
      console.log('✓ Dropped campaign_segments table');
      console.log('→ Use contact_segments table with usageType = "campaign" instead');
    } else {
      console.log('Table campaign_segments does not exist, skipping');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the table structure for rollback
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_segments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "filters" jsonb DEFAULT '[]',
        "filter_logic" character varying(3) DEFAULT 'AND',
        "contacts_count" integer DEFAULT 0,
        "metadata" jsonb,
        "is_active" boolean DEFAULT true,
        "is_dynamic" boolean DEFAULT false,
        "created_by" integer NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        "last_calculated_at" timestamp,
        CONSTRAINT "FK_campaign_segments_user" FOREIGN KEY ("created_by") 
          REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    
    console.log('✓ Recreated campaign_segments table');
  }
}
