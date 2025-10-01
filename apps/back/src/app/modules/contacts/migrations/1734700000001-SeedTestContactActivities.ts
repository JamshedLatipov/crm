import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTestContactActivities1734700000001 implements MigrationInterface {
  name = 'SeedTestContactActivities1734700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Получаем первые 3 контакта для добавления тестовой активности
    const contacts = await queryRunner.query(
      'SELECT id FROM contacts LIMIT 3'
    );

    if (contacts.length === 0) {
      console.log('No contacts found, skipping activity seeding');
      return;
    }

    const activities = [];
    const now = new Date();

    // Для каждого контакта создаем несколько записей активности
    contacts.forEach((contact: { id: string }, index: number) => {
      // Звонок 3 дня назад
      activities.push({
        contact_id: contact.id,
        type: 'call',
        title: 'Входящий звонок',
        description: 'Клиент интересовался услугами. Договорились о встрече.',
        user_name: 'Система',
        created_at: new Date(now.getTime() - (3 + index) * 24 * 60 * 60 * 1000),
      });

      // Email 2 дня назад
      activities.push({
        contact_id: contact.id,
        type: 'email',
        title: 'Отправлено коммерческое предложение',
        description: 'Отправлен детальный прайс-лист и условия сотрудничества.',
        user_name: 'Менеджер',
        created_at: new Date(now.getTime() - (2 + index) * 24 * 60 * 60 * 1000),
      });

      // Встреча вчера
      activities.push({
        contact_id: contact.id,
        type: 'meeting',
        title: 'Встреча в офисе',
        description: 'Презентация продукта. Клиент заинтересован в пилотном проекте.',
        user_name: 'Менеджер',
        created_at: new Date(now.getTime() - (1 + index * 0.5) * 24 * 60 * 60 * 1000),
      });

      // Заметка сегодня
      activities.push({
        contact_id: contact.id,
        type: 'note',
        title: 'Заметка о контакте',
        description: 'Клиент готов подписать договор. Ожидает финального предложения.',
        user_name: 'Менеджер',
        created_at: new Date(now.getTime() - index * 60 * 60 * 1000), // Сдвиг на несколько часов
      });
    });

    // Вставляем все активности
    for (const activity of activities) {
      await queryRunner.query(
        `INSERT INTO contact_activities (contact_id, type, title, description, user_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          activity.contact_id,
          activity.type,
          activity.title,
          activity.description,
          activity.user_name,
          activity.created_at,
          activity.created_at, // updated_at = created_at for initial data
        ]
      );
    }

    console.log(`Seeded ${activities.length} contact activities`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM contact_activities WHERE user_name IN (?, ?)', [
      'Система',
      'Менеджер'
    ]);
  }
}