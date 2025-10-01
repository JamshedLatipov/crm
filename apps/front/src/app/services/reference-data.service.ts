import { Injectable, signal, computed } from '@angular/core';

export interface Department {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
}

export interface Territory {
  id: string;
  name: string;
  region: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ReferenceDataService {
  // Departments
  public readonly departments = signal<Department[]>([
    { id: 'sales', name: 'Продажи', description: 'Отдел продаж и коммерции', isActive: true },
    { id: 'marketing', name: 'Маркетинг', description: 'Маркетинг и продвижение', isActive: true },
    { id: 'it', name: 'IT', description: 'Информационные технологии', isActive: true },
    { id: 'hr', name: 'HR', description: 'Управление персоналом', isActive: true },
    { id: 'finance', name: 'Финансы', description: 'Финансовый отдел', isActive: true },
    { id: 'support', name: 'Поддержка клиентов', description: 'Техническая поддержка', isActive: true },
    { id: 'operations', name: 'Операции', description: 'Операционный отдел', isActive: true },
    { id: 'legal', name: 'Юридический', description: 'Юридический отдел', isActive: true },
    { id: 'logistics', name: 'Логистика', description: 'Отдел логистики', isActive: true },
    { id: 'quality', name: 'Качество', description: 'Контроль качества', isActive: true }
  ]);

  // Roles
  public readonly roles = signal<Role[]>([
    {
      id: 'admin',
      name: 'Администратор',
      description: 'Полный доступ ко всем функциям системы',
      permissions: ['all'],
      isActive: true
    },
    {
      id: 'sales_manager',
      name: 'Менеджер продаж',
      description: 'Управление продажами и клиентами',
      permissions: ['read_users', 'write_leads', 'read_reports'],
      isActive: true
    },
    {
      id: 'senior_manager',
      name: 'Старший менеджер',
      description: 'Старший менеджер с расширенными правами',
      permissions: ['read_users', 'write_users', 'write_leads', 'read_reports', 'write_reports'],
      isActive: true
    },
    {
      id: 'team_lead',
      name: 'Руководитель команды',
      description: 'Руководство командой и распределение задач',
      permissions: ['read_users', 'write_leads', 'read_reports', 'manage_team'],
      isActive: true
    },
    {
      id: 'account_manager',
      name: 'Менеджер аккаунтов',
      description: 'Управление ключевыми клиентами',
      permissions: ['read_users', 'write_leads', 'read_reports', 'manage_accounts'],
      isActive: true
    },
    {
      id: 'client',
      name: 'Клиент',
      description: 'Ограниченный доступ для клиентов',
      permissions: ['read_own_data'],
      isActive: true
    }
  ]);

  // Skills
  public readonly skills = signal<Skill[]>([
    // Продажи и переговоры
    { id: 'b2b_sales', name: 'B2B продажи', category: 'Продажи и переговоры', isActive: true },
    { id: 'b2c_sales', name: 'B2C продажи', category: 'Продажи и переговоры', isActive: true },
    { id: 'negotiations', name: 'Переговоры', category: 'Продажи и переговоры', isActive: true },
    { id: 'presentations', name: 'Презентации', category: 'Продажи и переговоры', isActive: true },
    { id: 'cold_calls', name: 'Холодные звонки', category: 'Продажи и переговоры', isActive: true },
    { id: 'warm_calls', name: 'Теплые звонки', category: 'Продажи и переговоры', isActive: true },
    { id: 'deal_closing', name: 'Закрытие сделок', category: 'Продажи и переговоры', isActive: true },
    { id: 'objection_handling', name: 'Работа с возражениями', category: 'Продажи и переговоры', isActive: true },

    // Маркетинг и продвижение
    { id: 'email_marketing', name: 'Email маркетинг', category: 'Маркетинг и продвижение', isActive: true },
    { id: 'smm_marketing', name: 'SMM маркетинг', category: 'Маркетинг и продвижение', isActive: true },
    { id: 'content_marketing', name: 'Контент маркетинг', category: 'Маркетинг и продвижение', isActive: true },
    { id: 'seo_optimization', name: 'SEO оптимизация', category: 'Маркетинг и продвижение', isActive: true },
    { id: 'targeted_ads', name: 'Таргетированная реклама', category: 'Маркетинг и продвижение', isActive: true },
    { id: 'event_marketing', name: 'Event маркетинг', category: 'Маркетинг и продвижение', isActive: true },
    { id: 'partnership_marketing', name: 'Партнерский маркетинг', category: 'Маркетинг и продвижение', isActive: true },

    // Технические навыки
    { id: 'crm_systems', name: 'CRM системы', category: 'Технические навыки', isActive: true },
    { id: 'data_analysis', name: 'Анализ данных', category: 'Технические навыки', isActive: true },
    { id: 'excel_sheets', name: 'Excel/Google Sheets', category: 'Технические навыки', isActive: true },
    { id: 'sql_queries', name: 'SQL запросы', category: 'Технические навыки', isActive: true },
    { id: 'project_management', name: 'Управление проектами', category: 'Технические навыки', isActive: true },
    { id: 'agile_scrum', name: 'Agile/Scrum', category: 'Технические навыки', isActive: true },
    { id: 'business_analysis', name: 'Бизнес-аналитика', category: 'Технические навыки', isActive: true },
    { id: 'process_automation', name: 'Автоматизация процессов', category: 'Технические навыки', isActive: true },

    // Отраслевая экспертиза
    { id: 'it_telecom', name: 'IT и телеком', category: 'Отраслевая экспертиза', isActive: true },
    { id: 'financial_services', name: 'Финансовые услуги', category: 'Отраслевая экспертиза', isActive: true },
    { id: 'manufacturing', name: 'Производство', category: 'Отраслевая экспертиза', isActive: true },
    { id: 'logistics', name: 'Логистика', category: 'Отраслевая экспертиза', isActive: true },
    { id: 'real_estate', name: 'Недвижимость', category: 'Отраслевая экспертиза', isActive: true },
    { id: 'education', name: 'Образование', category: 'Отраслевая экспертиза', isActive: true },
    { id: 'healthcare', name: 'Здравоохранение', category: 'Отраслевая экспертиза', isActive: true },
    { id: 'ecommerce', name: 'E-commerce', category: 'Отраслевая экспертиза', isActive: true },
    { id: 'retail_trade', name: 'Retail и торговля', category: 'Отраслевая экспертиза', isActive: true },
    { id: 'consulting', name: 'Консалтинг', category: 'Отраслевая экспертиза', isActive: true },
    { id: 'government_sector', name: 'Государственный сектор', category: 'Отраслевая экспертиза', isActive: true },

    // Управленческие навыки
    { id: 'team_management', name: 'Управление командой', category: 'Управленческие навыки', isActive: true },
    { id: 'coaching_mentoring', name: 'Коучинг и менторинг', category: 'Управленческие навыки', isActive: true },
    { id: 'strategic_planning', name: 'Стратегическое планирование', category: 'Управленческие навыки', isActive: true },
    { id: 'budget_management', name: 'Управление бюджетом', category: 'Управленческие навыки', isActive: true },
    { id: 'staff_training', name: 'Обучение персонала', category: 'Управленческие навыки', isActive: true },
    { id: 'kpi_setting', name: 'Постановка KPI', category: 'Управленческие навыки', isActive: true },

    // Клиентский сервис
    { id: 'customer_service', name: 'Обслуживание клиентов', category: 'Клиентский сервис', isActive: true },
    { id: 'conflict_resolution', name: 'Решение конфликтов', category: 'Клиентский сервис', isActive: true },
    { id: 'technical_support', name: 'Техническая поддержка', category: 'Клиентский сервис', isActive: true },
    { id: 'consulting', name: 'Консультирование', category: 'Клиентский сервис', isActive: true },
    { id: 'complaint_handling', name: 'Работа с жалобами', category: 'Клиентский сервис', isActive: true },
    { id: 'retention_marketing', name: 'Retention маркетинг', category: 'Клиентский сервис', isActive: true },

    // Языковые навыки
    { id: 'english', name: 'Английский язык', category: 'Языковые навыки', isActive: true },
    { id: 'german', name: 'Немецкий язык', category: 'Языковые навыки', isActive: true },
    { id: 'french', name: 'Французский язык', category: 'Языковые навыки', isActive: true },
    { id: 'chinese', name: 'Китайский язык', category: 'Языковые навыки', isActive: true },
    { id: 'spanish', name: 'Испанский язык', category: 'Языковые навыки', isActive: true },
    { id: 'italian', name: 'Итальянский язык', category: 'Языковые навыки', isActive: true }
  ]);

  // Territories
  public readonly territories = signal<Territory[]>([
    // Регионы Таджикистана
    { id: 'dushanbe', name: 'Душанбе', region: 'Республиканское подчинение', isActive: true },
    { id: 'sogd', name: 'Согдийская область', region: 'Северный Таджикистан', isActive: true },
    { id: 'khatlon', name: 'Хатлонская область', region: 'Южный Таджикистан', isActive: true },
    { id: 'gorno_badakhshan', name: 'Горно-Бадахшанская автономная область', region: 'Восточный Таджикистан', isActive: true },
    { id: 'districts_republican', name: 'Районы республиканского подчинения', region: 'Центральный Таджикистан', isActive: true },

    // Города и районы Согдийской области
    { id: 'khujand', name: 'Худжанд', region: 'Согдийская область', isActive: true },
    { id: 'kanibadam', name: 'Канибадам', region: 'Согдийская область', isActive: true },
    { id: 'israel', name: 'Исфара', region: 'Согдийская область', isActive: true },
    { id: 'konibodom', name: 'Конибодом', region: 'Согдийская область', isActive: true },
    { id: 'panjakent', name: 'Панджакент', region: 'Согдийская область', isActive: true },
    { id: 'istaravshan', name: 'Истаравшан', region: 'Согдийская область', isActive: true },
    { id: 'pendjikent', name: 'Пенджикент', region: 'Согдийская область', isActive: true },
    { id: 'zafarobod', name: 'Зафарабад', region: 'Согдийская область', isActive: true },
    { id: 'asht', name: 'Ашт', region: 'Согдийская область', isActive: true },
    { id: 'buston', name: 'Бустон', region: 'Согдийская область', isActive: true },
    { id: 'dehavz', name: 'Дехавз', region: 'Согдийская область', isActive: true },
    { id: 'gafurov', name: 'Гафуров', region: 'Согдийская область', isActive: true },
    { id: 'jabbor_rasulov', name: 'Джаббор Расулов', region: 'Согдийская область', isActive: true },
    { id: 'kgon', name: 'Канибадамский район', region: 'Согдийская область', isActive: true },
    { id: 'mastchoh', name: 'Мастава', region: 'Согдийская область', isActive: true },
    { id: 'shahriston', name: 'Шахристон', region: 'Согдийская область', isActive: true },
    { id: 'spitamen', name: 'Спитамен', region: 'Согдийская область', isActive: true },
    { id: 'taboshar', name: 'Табошар', region: 'Согдийская область', isActive: true },

    // Города и районы Хатлонской области
    { id: 'kulob', name: 'Куляб', region: 'Хатлонская область', isActive: true },
    { id: 'kurgan_tube', name: 'Курган-Тюбе', region: 'Хатлонская область', isActive: true },
    { id: 'bokhtar', name: 'Бохтар', region: 'Хатлонская область', isActive: true },
    { id: 'sarband', name: 'Сарбанд', region: 'Хатлонская область', isActive: true },
    { id: 'temurmalik', name: 'Темурмалик', region: 'Хатлонская область', isActive: true },
    { id: 'shahrituz', name: 'Шахритуз', region: 'Хатлонская область', isActive: true },
    { id: 'hisor', name: 'Гиссар', region: 'Хатлонская область', isActive: true },
    { id: 'vahdat', name: 'Вахдат', region: 'Хатлонская область', isActive: true },
    { id: 'rogun', name: 'Рогун', region: 'Хатлонская область', isActive: true },
    { id: 'tursunzoda', name: 'Турсунзода', region: 'Хатлонская область', isActive: true },
    { id: 'shorabu', name: 'Шорабу', region: 'Хатлонская область', isActive: true },
    { id: 'jayhun', name: 'Джайхун', region: 'Хатлонская область', isActive: true },
    { id: 'kushoniyon', name: 'Кушониён', region: 'Хатлонская область', isActive: true },
    { id: 'muminobod', name: 'Муминабад', region: 'Хатлонская область', isActive: true },
    { id: 'norak', name: 'Норак', region: 'Хатлонская область', isActive: true },
    { id: 'pyandj', name: 'Пяндж', region: 'Хатлонская область', isActive: true },
    { id: 'vakhsh', name: 'Вахш', region: 'Хатлонская область', isActive: true },
    { id: 'yovon', name: 'Йовон', region: 'Хатлонская область', isActive: true },

    // Районы Горно-Бадахшанской автономной области
    { id: 'khorog', name: 'Хорог', region: 'Горно-Бадахшанская автономная область', isActive: true },
    { id: 'murghob', name: 'Мургаб', region: 'Горно-Бадахшанская автономная область', isActive: true },
    { id: 'rushon', name: 'Рушан', region: 'Горно-Бадахшанская автономная область', isActive: true },
    { id: 'shughnon', name: 'Шугнан', region: 'Горно-Бадахшанская автономная область', isActive: true },
    { id: 'roshtqala', name: 'Росхткала', region: 'Горно-Бадахшанская автономная область', isActive: true },
    { id: 'darvoz', name: 'Дарвоз', region: 'Горно-Бадахшанская автономная область', isActive: true },
    { id: 'vanch', name: 'Ванч', region: 'Горно-Бадахшанская автономная область', isActive: true },
    { id: 'ishkoshim', name: 'Ишкашим', region: 'Горно-Бадахшанская автономная область', isActive: true },

    // Районы республиканского подчинения
    { id: 'varzob', name: 'Варзоб', region: 'Районы республиканского подчинения', isActive: true },
    { id: 'hissor', name: 'Гиссар', region: 'Районы республиканского подчинения', isActive: true },
    { id: 'rudaki', name: 'Рудаки', region: 'Районы республиканского подчинения', isActive: true },
    { id: 'shahmansur', name: 'Шахмансур', region: 'Районы республиканского подчинения', isActive: true },
    { id: 'tojikobod', name: 'Таджикабад', region: 'Районы республиканского подчинения', isActive: true },

    // Международные регионы
    { id: 'uzbekistan', name: 'Узбекистан', region: 'Международные регионы', isActive: true },
    { id: 'kyrgyzstan', name: 'Киргизия', region: 'Международные регионы', isActive: true },
    { id: 'afghanistan', name: 'Афганистан', region: 'Международные регионы', isActive: true },
    { id: 'china', name: 'Китай', region: 'Международные регионы', isActive: true }
  ]);

  // Computed properties for active items only
  public readonly activeDepartments = computed(() =>
    this.departments().filter(d => d.isActive)
  );

  public readonly activeRoles = computed(() =>
    this.roles().filter(r => r.isActive)
  );

  public readonly activeSkills = computed(() =>
    this.skills().filter(s => s.isActive)
  );

  public readonly activeTerritories = computed(() =>
    this.territories().filter(t => t.isActive)
  );

  // Utility methods
  getDepartmentById(id: string): Department | undefined {
    return this.departments().find(d => d.id === id);
  }

  getRoleById(id: string): Role | undefined {
    return this.roles().find(r => r.id === id);
  }

  getSkillById(id: string): Skill | undefined {
    return this.skills().find(s => s.id === id);
  }

  getTerritoryById(id: string): Territory | undefined {
    return this.territories().find(t => t.id === id);
  }

  getSkillsByCategory(category: string): Skill[] {
    return this.activeSkills().filter(s => s.category === category);
  }

  getTerritoriesByRegion(region: string): Territory[] {
    return this.activeTerritories().filter(t => t.region === region);
  }
}