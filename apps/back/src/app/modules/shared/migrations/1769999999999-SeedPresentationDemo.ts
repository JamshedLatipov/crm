import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';

export class SeedPresentationDemo1769999999999 implements MigrationInterface {
  name = 'SeedPresentationDemo1769999999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Truncate all user tables except migrations/history
    await queryRunner.query(`DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('migrations','spatial_ref_sys')
      ) LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" RESTART IDENTITY CASCADE';
      END LOOP;
    END$$;`);

    // 2) Insert demo users
    const passwordHash = '$2b$10$h21TvWmjh3vy6miKYtIp7e3bjAv6JZ7fiYYZZ8G2yBrux21UZw3Vu';
    await queryRunner.query(
      `INSERT INTO users (username, password, roles, "isActive", "createdAt", "updatedAt") VALUES
      ('admin', $1, 'admin', true, now(), now()),
      ('john.doe', $1, 'sales_manager', true, now(), now()),
      ('jane.smith', $1, 'sales_manager', true, now(), now())
      ON CONFLICT (username) DO NOTHING`,
      [passwordHash]
    );

    // 3) Create a few companies
    const companies = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Acme Corp',
        type: 'client',
        industry: 'technology',
        size: 'medium',
        phone: '+1 555-0100',
        email: 'sales@acme.example',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Contoso Ltd',
        type: 'prospect',
        industry: 'finance',
        size: 'small',
        phone: '+1 555-0200',
        email: 'contact@contoso.example',
      }
    ];

    for (const c of companies) {
      await queryRunner.query(
        `INSERT INTO "company" ("id","name","type","industry","size","phone","email","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,now(),now())
         ON CONFLICT ("id") DO NOTHING`,
        [c.id, c.name, c.type, c.industry, c.size, c.phone, c.email]
      );
    }

    // 4) Insert contacts associated with companies
    const contacts = [
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Ivan Petrov',
        companyId: companies[0].id,
        email: 'ivan.petrov@acme.example',
        phone: '+7 495 111-2222'
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Maria Ivanova',
        companyId: companies[1].id,
        email: 'm.ivanova@contoso.example',
        phone: '+7 495 222-3333'
      }
    ];

    for (const ct of contacts) {
      await queryRunner.query(
        `INSERT INTO contacts (id, name, "companyId", email, phone, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,now(),now())
         ON CONFLICT (id) DO NOTHING`,
        [ct.id, ct.name, ct.companyId, ct.email, ct.phone]
      );
    }

    // 5) Insert a pipeline stage to attach deals to
    const stageId = randomUUID();
    await queryRunner.query(
      `INSERT INTO pipeline_stages (id, name, type, position, probability, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,1,50,now(),now()) ON CONFLICT (id) DO NOTHING`,
      [stageId, 'Demo - Qualification', 'deal_progression']
    );

    // 6) Insert leads
    await queryRunner.query(
      `INSERT INTO leads (name, email, phone, "companyId", status, score, source, priority, "createdAt", "updatedAt")
       VALUES
       ('Lead — CEO of Acme', 'ceo@acme.example', '+7 495 999-0001', $1, 'contacted', 75, 'linkedin', 'high', now(), now()),
       ('Lead — CFO Contoso', 'cfo@contoso.example', '+7 495 999-0002', $2, 'new', 40, 'website', 'medium', now(), now())`,
      [companies[0].id, companies[1].id]
    );

    // 7) Insert deals linking to contacts and companies
    const dealId1 = randomUUID();
    const dealId2 = randomUUID();
    await queryRunner.query(
      `INSERT INTO deals (id, title, "companyId", "contactId", amount, currency, probability, "expectedCloseDate", "stageId", status, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,'USD',60,now() + interval '30 days',$6,'open',now(),now()),
              ($7,$8,$9,$10,$11,'USD',40,now() + interval '45 days',$6,'open',now(),now())
       ON CONFLICT (id) DO NOTHING`,
      [dealId1, 'Acme — Website revamp', companies[0].id, contacts[0].id, 12000, stageId,
       dealId2, 'Contoso — Advisory package', companies[1].id, contacts[1].id, 8000]
    );

    // 8) Insert a couple of demo tasks (handle schema variations: assignedTo column may be removed)
    const hasAssignedToCamel = await queryRunner.hasColumn('tasks', 'assignedTo');
    const hasAssignedToSnake = await queryRunner.hasColumn('tasks', 'assigned_to');

    if (hasAssignedToCamel || hasAssignedToSnake) {
      const assignedCol = hasAssignedToCamel ? '"assignedTo"' : '"assigned_to"';
      await queryRunner.query(
        `INSERT INTO tasks (title, description, ${assignedCol}, "dueDate", status, "createdAt", "updatedAt") VALUES
         ('Follow up with Acme CEO', 'Call to discuss requirements and next steps', 'john.doe', now() + interval '3 days', 'open', now(), now()),
         ('Send proposal to Contoso', 'Prepare and email proposal', 'jane.smith', now() + interval '7 days', 'open', now(), now())`);
    } else {
      // tasks table no longer has assignedTo column; insert tasks without assignee
      await queryRunner.query(
        `INSERT INTO tasks (title, description, "dueDate", status, "createdAt", "updatedAt") VALUES
         ('Follow up with Acme CEO', 'Call to discuss requirements and next steps', now() + interval '3 days', 'open', now(), now()),
         ('Send proposal to Contoso', 'Prepare and email proposal', now() + interval '7 days', 'open', now(), now())`);

      // Create assignments entries linking the created tasks to demo users (use username lookup)
      // Prefer explicit task_id column in assignments; fall back to polymorphic entity_type/entity_id if necessary
      const hasAssignmentsTaskId = await queryRunner.hasColumn('assignments', 'task_id');
      if (hasAssignmentsTaskId) {
        await queryRunner.query(`
          INSERT INTO assignments (entity_type, task_id, user_id, assigned_by, status, assigned_at, created_at, updated_at)
          SELECT 'task', t.id, u.id, u.id, 'active', now(), now(), now()
          FROM tasks t JOIN users u ON u.username = 'john.doe' WHERE t.title = 'Follow up with Acme CEO'
          ON CONFLICT DO NOTHING
        `);

        await queryRunner.query(`
          INSERT INTO assignments (entity_type, task_id, user_id, assigned_by, status, assigned_at, created_at, updated_at)
          SELECT 'task', t.id, u.id, u.id, 'active', now(), now(), now()
          FROM tasks t JOIN users u ON u.username = 'jane.smith' WHERE t.title = 'Send proposal to Contoso'
          ON CONFLICT DO NOTHING
        `);
      } else {
        // Older schema: use polymorphic entity_id
        await queryRunner.query(`
          INSERT INTO assignments (entity_type, entity_id, user_id, assigned_by, status, assigned_at, created_at, updated_at)
          SELECT 'task', t.id::text, u.id, u.id, 'active', now(), now(), now()
          FROM tasks t JOIN users u ON u.username = 'john.doe' WHERE t.title = 'Follow up with Acme CEO'
          ON CONFLICT DO NOTHING
        `);

        await queryRunner.query(`
          INSERT INTO assignments (entity_type, entity_id, user_id, assigned_by, status, assigned_at, created_at, updated_at)
          SELECT 'task', t.id::text, u.id, u.id, 'active', now(), now(), now()
          FROM tasks t JOIN users u ON u.username = 'jane.smith' WHERE t.title = 'Send proposal to Contoso'
          ON CONFLICT DO NOTHING
        `);
      }
    }

    console.log('Presentation demo seed applied');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Try to remove seeded demo data by matching known identifiers
    await queryRunner.query(`DELETE FROM tasks WHERE title IN ('Follow up with Acme CEO','Send proposal to Contoso')`);
    await queryRunner.query(`DELETE FROM deals WHERE title IN ('Acme — Website revamp','Contoso — Advisory package')`);
    await queryRunner.query(`DELETE FROM leads WHERE name IN ('Lead — CEO of Acme','Lead — CFO Contoso')`);
    await queryRunner.query(`DELETE FROM contacts WHERE id IN ('33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444')`);
    await queryRunner.query(`DELETE FROM "company" WHERE id IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')`);
    await queryRunner.query(`DELETE FROM users WHERE username IN ('john.doe','jane.smith')`);
    // keep admin intact if present
  }
}
