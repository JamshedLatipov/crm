import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateExistingAgentStatuses1735675201000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Copy current statuses from agent_statuses to agent_status_history
    // This creates an initial snapshot of all operator statuses
    await queryRunner.query(`
      INSERT INTO agent_status_history 
        (user_id, extension, full_name, status, previous_status, reason, queue_name, status_changed_at, created_at)
      SELECT 
        user_id, 
        extension, 
        full_name, 
        status, 
        previous_status, 
        reason, 
        queue_name, 
        status_changed_at,
        NOW()
      FROM agent_statuses
      WHERE extension IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove migrated records (optional - keep history if rolling back)
    await queryRunner.query(`
      DELETE FROM agent_status_history 
      WHERE created_at = (SELECT MIN(created_at) FROM agent_status_history)
    `);
  }
}
