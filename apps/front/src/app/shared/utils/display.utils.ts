/**
 * Утилиты для преобразования значений в читаемый вид
 */

/**
 * Преобразует роль пользователя в читаемый формат
 * @param role - Роль пользователя (например, 'sales_manager')
 * @returns Читаемое название роли (например, 'Менеджер продаж')
 */
export function roleDisplay(role?: string | null): string {
  if (!role) return '';
  
  const roleMap: Record<string, string> = {
    admin: 'Администратор',
    sales_manager: 'Менеджер продаж',
    senior_manager: 'Старший менеджер',
    team_lead: 'Руководитель команды',
    account_manager: 'Менеджер аккаунтов',
    client: 'Клиент',
    intern: 'Стажёр',
    operator: 'Оператор',
  };
  
  return roleMap[role] || role;
}

/**
 * Преобразует департамент в читаемый формат
 * @param department - Департамент (например, 'sales')
 * @returns Читаемое название департамента (например, 'Продажи')
 */
export function departmentDisplay(department?: string | null): string {
  if (!department) return '';
  
  const departmentMap: Record<string, string> = {
    sales: 'Продажи',
    marketing: 'Маркетинг',
    support: 'Поддержка',
    development: 'Разработка',
    hr: 'HR',
    finance: 'Финансы',
    management: 'Управление',
    operations: 'Операции',
    it: 'IT',
  };
  
  return departmentMap[department] || department;
}

/**
 * Преобразует статус сделки в читаемый формат
 * @param status - Статус сделки (например, 'open')
 * @returns Читаемый статус (например, 'Открыта')
 */
export function dealStatusDisplay(status?: string | null): string {
  if (!status) return '';
  
  const statusMap: Record<string, string> = {
    open: 'Открыта',
    won: 'Выиграна',
    lost: 'Проиграна',
    in_progress: 'В работе',
    closed: 'Закрыта',
  };
  
  return statusMap[status] || status;
}

/**
 * Преобразует статус задачи в читаемый формат
 * @param status - Статус задачи (например, 'pending')
 * @returns Читаемый статус (например, 'Ожидает')
 */
export function taskStatusDisplay(status?: string | null): string {
  if (!status) return '';
  
  const statusMap: Record<string, string> = {
    pending: 'Ожидает',
    in_progress: 'В работе',
    completed: 'Завершена',
    cancelled: 'Отменена',
    on_hold: 'Приостановлена',
  };
  
  return statusMap[status] || status;
}

/**
 * Преобразует приоритет в читаемый формат
 * @param priority - Приоритет (например, 'high')
 * @returns Читаемый приоритет (например, 'Высокий')
 */
export function priorityDisplay(priority?: string | null): string {
  if (!priority) return '';
  
  const priorityMap: Record<string, string> = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
    urgent: 'Срочный',
  };
  
  return priorityMap[priority] || priority;
}

/**
 * Получает символ валюты
 * @param currency - Код валюты (например, 'RUB')
 * @returns Символ валюты (например, '₽')
 */
export function getCurrencySymbol(currency: string): string {
  const currencyMap: Record<string, string> = {
    RUB: '₽',
    TJS: 'SM',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    CHF: '₣',
    KZT: '₸',
    UAH: '₴',
  };
  
  return currencyMap[currency] || currency;
}

/**
 * Получает название валюты на русском
 * @param currency - Код валюты (например, 'RUB')
 * @returns Название валюты (например, 'Рубль')
 */
export function getCurrencyName(currency: string): string {
  const currencyMap: Record<string, string> = {
    RUB: 'Рубль',
    TJS: 'Сомони',
    USD: 'Доллар',
    EUR: 'Евро',
    GBP: 'Фунт стерлингов',
    JPY: 'Японская иена',
    CNY: 'Китайский юань',
    CHF: 'Швейцарский франк',
    KZT: 'Казахский тенге',
    UAH: 'Украинская гривна',
  };
  
  return currencyMap[currency] || currency;
}

/**
 * Переводит ключи метаданных в читаемый формат
 * @param key - Ключ метаданных (например, 'utm_source')
 * @returns Переведенное название (например, 'UTM источник')
 */
export function translateMetadataKey(key: string): string {
  const translations: Record<string, string> = {
    'source': 'Источник',
    'campaign': 'Кампания',
    'utm_source': 'UTM источник',
    'utm_medium': 'UTM канал',
    'utm_campaign': 'UTM кампания',
    'utm_content': 'UTM контент',
    'utm_term': 'UTM термин',
    'referrer': 'Реферер',
    'landing_page': 'Посадочная страница',
    'lead_score': 'Оценка лида',
    'conversion_date': 'Дата конверсии',
    'original_lead_id': 'ID исходного лида',
    'sales_rep': 'Менеджер продаж',
    'region': 'Регион',
    'industry': 'Отрасль',
    'company_size': 'Размер компании',
    'budget': 'Бюджет',
    'decision_maker': 'Лицо, принимающее решения',
    'competitors': 'Конкуренты',
    'pain_points': 'Болевые точки',
    'demo_date': 'Дата демонстрации',
    'proposal_sent_date': 'Дата отправки предложения',
    'contract_type': 'Тип контракта',
    'payment_terms': 'Условия оплаты',
    'delivery_date': 'Дата поставки',
    'custom_field_1': 'Дополнительное поле 1',
    'custom_field_2': 'Дополнительное поле 2',
    'custom_field_3': 'Дополнительное поле 3',
    'notes': 'Заметки',
    'tags': 'Теги'
  };

  return translations[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

/**
 * Преобразует статус лида в читаемый формат
 * @param status - Статус лида
 * @returns Читаемый статус
 */
export function leadStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    'new': 'Новый',
    'contacted': 'Контакт установлен',
    'qualified': 'Квалифицирован',
    'proposal_sent': 'Предложение отправлено',
    'negotiating': 'Переговоры',
    'converted': 'Конвертирован',
    'rejected': 'Отклонен',
    'lost': 'Потерян',
  };
  
  return statusMap[status] || status;
}

/**
 * Преобразует источник лида в читаемый формат
 * @param source - Источник лида
 * @returns Читаемый источник
 */
export function leadSourceDisplay(source: string): string {
  const sourceMap: Record<string, string> = {
    'website': 'Веб-сайт',
    'facebook': 'Facebook',
    'google_ads': 'Google Ads',
    'linkedin': 'LinkedIn',
    'email': 'Email',
    'phone': 'Телефон',
    'referral': 'Рекомендация',
    'trade_show': 'Выставка',
    'webinar': 'Вебинар',
    'content_marketing': 'Контент-маркетинг',
    'cold_outreach': 'Холодный обзвон',
    'partner': 'Партнер',
    'other': 'Другое',
  };
  
  return sourceMap[source] || source;
}

/**
 * Получает цвет для статуса лида
 * @param status - Статус лида
 * @returns HEX-код цвета
 */
export function getLeadStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'new': '#4caf50',
    'contacted': '#2196f3',
    'qualified': '#ffc107',
    'proposal_sent': '#9c27b0',
    'negotiating': '#ff5722',
    'converted': '#4caf50',
    'rejected': '#f44336',
    'lost': '#616161',
  };
  
  return colorMap[status] || '#616161';
}

/**
 * Получает прогресс для статуса лида (0-100%)
 * @param status - Статус лида
 * @returns Процент прогресса
 */
export function getLeadStatusProgress(status: string): number {
  const progressMap: Record<string, number> = {
    'new': 10,
    'contacted': 25,
    'qualified': 40,
    'proposal_sent': 60,
    'negotiating': 80,
    'converted': 100,
    'rejected': 0,
    'lost': 0,
  };
  
  return progressMap[status] || 0;
}

/**
 * Преобразует приоритет лида в читаемый формат
 * @param priority - Приоритет лида
 * @returns Читаемый приоритет
 */
export function leadPriorityDisplay(priority: string): string {
  const priorityMap: Record<string, string> = {
    'low': 'Низкий',
    'medium': 'Средний',
    'high': 'Высокий',
    'urgent': 'Срочный',
  };
  
  return priorityMap[priority] || priority;
}

/**
 * Получает CSS-класс для бейджа статуса пользователя
 * @param isActive - Активен ли пользователь
 * @returns CSS-классы для бейджа
 */
export function getUserStatusBadgeClass(isActive: boolean): string {
  const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
  return isActive
    ? `${baseClasses} bg-green-100 text-green-800`
    : `${baseClasses} bg-red-100 text-red-800`;
}

/**
 * Получает цвет для уровня загруженности
 * @param percentage - Процент загруженности (0-100)
 * @returns CSS-класс цвета
 */
export function getWorkloadColor(percentage: number): string {
  if (percentage < 50) return 'bg-green-500';
  if (percentage < 75) return 'bg-yellow-500';
  if (percentage < 90) return 'bg-orange-500';
  return 'bg-red-500';
}

/**
 * Получает метку уровня загруженности
 * @param workload - Уровень загруженности ('low', 'medium', 'high', 'overloaded')
 * @returns Читаемая метка
 */
export function getWorkloadLabel(workload: string): string {
  const workloadMap: Record<string, string> = {
    'low': 'Низкая',
    'medium': 'Средняя',
    'high': 'Высокая',
    'overloaded': 'Перегружен',
  };
  
  return workloadMap[workload] || workload;
}
