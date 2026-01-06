import { Injectable } from '@angular/core';

export interface TemplateVariable {
  key: string;
  label: string;
  description?: string;
  example?: string;
}

export interface VariableGroup {
  name: string;
  icon: string;
  variables: TemplateVariable[];
}

@Injectable({
  providedIn: 'root'
})
export class TemplateVariablesService {
  
  /**
   * Получить все доступные группы переменных для использования в шаблонах
   */
  getVariableGroups(): VariableGroup[] {
    return [
      {
        name: 'Контакт',
        icon: 'person',
        variables: [
          { key: 'contact.name', label: 'Имя', description: 'Полное имя контакта', example: 'Иван Иванов' },
          { key: 'contact.firstName', label: 'Имя', description: 'Имя контакта', example: 'Иван' },
          { key: 'contact.lastName', label: 'Фамилия', description: 'Фамилия контакта', example: 'Иванов' },
          { key: 'contact.middleName', label: 'Отчество', description: 'Отчество контакта', example: 'Петрович' },
          { key: 'contact.email', label: 'Email', description: 'Email адрес', example: 'ivan@example.com' },
          { key: 'contact.phone', label: 'Телефон', description: 'Основной телефон', example: '+992123456789' },
          { key: 'contact.mobilePhone', label: 'Мобильный', description: 'Мобильный телефон', example: '+992987654321' },
          { key: 'contact.workPhone', label: 'Рабочий телефон', description: 'Рабочий телефон', example: '+992123456789' },
          { key: 'contact.position', label: 'Должность', description: 'Должность в компании', example: 'Менеджер' },
          { key: 'contact.website', label: 'Веб-сайт', description: 'Веб-сайт контакта', example: 'www.example.com' },
        ]
      },
      {
        name: 'Компания',
        icon: 'business',
        variables: [
          { key: 'company.name', label: 'Название', description: 'Название компании', example: 'ООО "Рога и Копыта"' },
          { key: 'company.legalName', label: 'Юр. название', description: 'Полное юридическое название', example: 'Общество с ограниченной ответственностью "Рога и Копыта"' },
          { key: 'company.inn', label: 'ИНН', description: 'ИНН компании', example: '1234567890' },
          { key: 'company.industry', label: 'Отрасль', description: 'Отрасль компании', example: 'Технологии' },
          { key: 'company.email', label: 'Email', description: 'Email компании', example: 'info@company.com' },
          { key: 'company.phone', label: 'Телефон', description: 'Телефон компании', example: '+992123456789' },
          { key: 'company.website', label: 'Веб-сайт', description: 'Веб-сайт компании', example: 'www.company.com' },
          { key: 'company.address', label: 'Адрес', description: 'Адрес компании', example: 'г. Душанбе, ул. Рудаки 1' },
        ]
      },
      {
        name: 'Лид',
        icon: 'trending_up',
        variables: [
          { key: 'lead.name', label: 'Имя', description: 'Имя лида', example: 'Петр Петров' },
          { key: 'lead.email', label: 'Email', description: 'Email лида', example: 'petr@example.com' },
          { key: 'lead.phone', label: 'Телефон', description: 'Телефон лида', example: '+992123456789' },
          { key: 'lead.position', label: 'Должность', description: 'Должность', example: 'Директор' },
          { key: 'lead.status', label: 'Статус', description: 'Текущий статус лида', example: 'Новый' },
          { key: 'lead.source', label: 'Источник', description: 'Источник лида', example: 'Веб-сайт' },
          { key: 'lead.priority', label: 'Приоритет', description: 'Приоритет лида', example: 'Высокий' },
          { key: 'lead.estimatedValue', label: 'Оценка сделки', description: 'Предполагаемая стоимость', example: '50000' },
          { key: 'lead.company', label: 'Компания', description: 'Название компании лида', example: 'ООО "Компания"' },
        ]
      },
      {
        name: 'Сделка',
        icon: 'attach_money',
        variables: [
          { key: 'deal.title', label: 'Название', description: 'Название сделки', example: 'Продажа CRM системы' },
          { key: 'deal.amount', label: 'Сумма', description: 'Сумма сделки', example: '100000' },
          { key: 'deal.currency', label: 'Валюта', description: 'Валюта сделки', example: 'TJS' },
          { key: 'deal.probability', label: 'Вероятность', description: 'Вероятность закрытия (%)', example: '80' },
          { key: 'deal.status', label: 'Статус', description: 'Статус сделки', example: 'Открыта' },
          { key: 'deal.stage', label: 'Этап', description: 'Текущий этап сделки', example: 'Переговоры' },
          { key: 'deal.expectedCloseDate', label: 'Дата закрытия', description: 'Ожидаемая дата закрытия', example: '01.02.2026' },
        ]
      },
      {
        name: 'Системные',
        icon: 'settings',
        variables: [
          { key: 'system.date', label: 'Текущая дата', description: 'Сегодняшняя дата', example: '06.01.2026' },
          { key: 'system.time', label: 'Текущее время', description: 'Текущее время', example: '14:30' },
          { key: 'system.companyName', label: 'Название CRM', description: 'Название вашей компании', example: 'Моя CRM' },
        ]
      }
    ];
  }

  /**
   * Получить все переменные в виде плоского массива
   */
  getAllVariables(): TemplateVariable[] {
    return this.getVariableGroups().flatMap(group => group.variables);
  }

  /**
   * Найти переменную по ключу
   */
  findVariable(key: string): TemplateVariable | undefined {
    return this.getAllVariables().find(v => v.key === key);
  }

  /**
   * Получить синтаксис переменной для вставки в шаблон
   */
  getVariableSyntax(key: string): string {
    return `{{${key}}}`;
  }

  /**
   * Извлечь все переменные из текста шаблона
   */
  extractVariables(template: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      matches.push(match[1].trim());
    }
    
    return [...new Set(matches)]; // Уникальные значения
  }

  /**
   * Проверить валидность переменных в шаблоне
   */
  validateTemplate(template: string): { valid: boolean; invalidVariables: string[] } {
    const usedVariables = this.extractVariables(template);
    const validVariableKeys = this.getAllVariables().map(v => v.key);
    const invalidVariables = usedVariables.filter(v => !validVariableKeys.includes(v));
    
    return {
      valid: invalidVariables.length === 0,
      invalidVariables
    };
  }

  /**
   * Заменить переменные в шаблоне на реальные значения
   */
  renderTemplate(template: string, data: Record<string, any>): string {
    let result = template;
    
    const regex = /\{\{([^}]+)\}\}/g;
    result = result.replace(regex, (match, key) => {
      const trimmedKey = key.trim();
      const value = this.getNestedValue(data, trimmedKey);
      return value !== undefined && value !== null ? String(value) : match;
    });
    
    return result;
  }

  /**
   * Получить значение из вложенного объекта по пути (например, 'contact.name')
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
