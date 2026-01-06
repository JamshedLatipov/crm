import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../../contacts/contact.entity';
import { Lead } from '../../leads/lead.entity';
import { Deal } from '../../deals/deal.entity';
import { Company } from '../../companies/entities/company.entity';

export interface TemplateContext {
  contact?: Contact;
  lead?: Lead;
  deal?: Deal;
  company?: Company;
}

@Injectable()
export class TemplateRenderService {
  private readonly logger = new Logger(TemplateRenderService.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Deal)
    private readonly dealRepo: Repository<Deal>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  /**
   * Рендеринг шаблона с заменой переменных на реальные данные
   */
  async renderTemplate(template: string, context: TemplateContext): Promise<string> {
    let result = template;

    // Извлекаем все переменные из шаблона
    const variables = this.extractVariables(template);
    
    this.logger.debug(`Rendering template with ${variables.length} variables`);

    // Заменяем каждую переменную
    for (const variable of variables) {
      const value = await this.resolveVariable(variable, context);
      const placeholder = `{{${variable}}}`;
      result = result.replace(new RegExp(this.escapeRegExp(placeholder), 'g'), value || '');
    }

    return result;
  }

  /**
   * Извлечь все переменные из шаблона
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
   * Получить значение переменной из контекста
   */
  private async resolveVariable(variable: string, context: TemplateContext): Promise<string> {
    const parts = variable.split('.');
    const [entity, ...path] = parts;

    try {
      switch (entity) {
        case 'contact':
          return this.getNestedValue(context.contact, path);
        
        case 'lead':
          return this.getNestedValue(context.lead, path);
        
        case 'deal':
          // Если нужны связанные данные, загружаем их
          if (context.deal && !context.deal.contact && path[0] === 'contact') {
            const deal = await this.dealRepo.findOne({
              where: { id: context.deal.id },
              relations: ['contact', 'company', 'lead']
            });
            context.deal = deal || context.deal;
          }
          return this.getNestedValue(context.deal, path);
        
        case 'company':
          return this.getNestedValue(context.company, path);
        
        case 'system':
          return this.getSystemVariable(path[0]);
        
        default:
          this.logger.warn(`Unknown variable entity: ${entity}`);
          return `{{${variable}}}`;
      }
    } catch (error) {
      this.logger.error(`Error resolving variable ${variable}:`, error);
      return `{{${variable}}}`;
    }
  }

  /**
   * Получить значение из вложенного объекта
   */
  private getNestedValue(obj: any, path: string[]): string {
    if (!obj) return '';

    let current = obj;
    for (const key of path) {
      if (current[key] === undefined || current[key] === null) {
        return '';
      }
      current = current[key];
    }

    // Форматирование специальных типов
    if (current instanceof Date) {
      return this.formatDate(current);
    }

    if (typeof current === 'boolean') {
      return current ? 'Да' : 'Нет';
    }

    if (typeof current === 'number') {
      return current.toString();
    }

    if (typeof current === 'object') {
      // Если это связанная сущность с именем
      return current.name || current.title || JSON.stringify(current);
    }

    return String(current);
  }

  /**
   * Получить системную переменную
   */
  private getSystemVariable(key: string): string {
    const now = new Date();

    switch (key) {
      case 'date':
        return this.formatDate(now);
      
      case 'time':
        return this.formatTime(now);
      
      case 'companyName':
        return process.env.COMPANY_NAME || 'CRM System';
      
      default:
        return '';
    }
  }

  /**
   * Форматировать дату
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Форматировать время
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Экранировать специальные символы для регулярного выражения
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Загрузить полный контекст по ID сущностей
   */
  async loadContext(params: {
    contactId?: string;
    leadId?: number;
    dealId?: string;
    companyId?: string;
  }): Promise<TemplateContext> {
    const context: TemplateContext = {};

    if (params.contactId) {
      context.contact = await this.contactRepo.findOne({
        where: { id: params.contactId },
        relations: ['company']
      });
    }

    if (params.leadId) {
      context.lead = await this.leadRepo.findOne({
        where: { id: params.leadId },
        relations: ['company']
      });
    }

    if (params.dealId) {
      context.deal = await this.dealRepo.findOne({
        where: { id: params.dealId },
        relations: ['contact', 'company', 'lead', 'stage']
      });
      
      // Автоматически добавляем связанные сущности
      if (context.deal?.contact) {
        context.contact = context.deal.contact;
      }
      if (context.deal?.company) {
        context.company = context.deal.company;
      }
      if (context.deal?.lead) {
        context.lead = context.deal.lead;
      }
    }

    if (params.companyId && !context.company) {
      context.company = await this.companyRepo.findOne({
        where: { id: params.companyId }
      });
    }

    return context;
  }

  /**
   * Валидация шаблона - проверка существования переменных
   */
  validateTemplate(template: string): { valid: boolean; invalidVariables: string[] } {
    const variables = this.extractVariables(template);
    const validPrefixes = ['contact', 'lead', 'deal', 'company', 'system'];
    const invalidVariables: string[] = [];

    for (const variable of variables) {
      const entity = variable.split('.')[0];
      if (!validPrefixes.includes(entity)) {
        invalidVariables.push(variable);
      }
    }

    return {
      valid: invalidVariables.length === 0,
      invalidVariables
    };
  }
}
