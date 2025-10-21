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
