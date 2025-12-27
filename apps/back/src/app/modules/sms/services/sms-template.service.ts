import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsTemplate } from '../entities/sms-template.entity';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto/template.dto';
import { User } from '../../user/user.entity';

@Injectable()
export class SmsTemplateService {
  constructor(
    @InjectRepository(SmsTemplate)
    private templateRepository: Repository<SmsTemplate>
  ) {}

  /**
   * Создание нового шаблона
   */
  async create(createDto: CreateTemplateDto, user: User): Promise<SmsTemplate> {
    // Извлекаем переменные из контента шаблона
    const variables = this.extractVariables(createDto.content);

    const template = this.templateRepository.create({
      ...createDto,
      variables: createDto.variables || variables,
      createdBy: user,
    });

    return await this.templateRepository.save(template);
  }

  /**
   * Получение всех шаблонов
   */
  async findAll(filters?: {
    category?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<SmsTemplate[]> {
    const query = this.templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.createdBy', 'createdBy')
      .orderBy('template.createdAt', 'DESC');

    if (filters?.category) {
      query.andWhere('template.category = :category', { category: filters.category });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('template.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters?.search) {
      query.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search OR template.content ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return await query.getMany();
  }

  /**
   * Получение шаблона по ID
   */
  async findOne(id: string): Promise<SmsTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Обновление шаблона
   */
  async update(id: string, updateDto: UpdateTemplateDto): Promise<SmsTemplate> {
    const template = await this.findOne(id);

    // Если обновляется контент, пересчитываем переменные
    if (updateDto.content) {
      const variables = this.extractVariables(updateDto.content);
      updateDto.variables = updateDto.variables || variables;
    }

    Object.assign(template, updateDto);

    return await this.templateRepository.save(template);
  }

  /**
   * Удаление шаблона
   */
  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepository.remove(template);
  }

  /**
   * Рендеринг шаблона с подстановкой переменных
   */
  renderTemplate(template: SmsTemplate, variables: Record<string, any>): string {
    let rendered = template.content;

    // Подставляем переменные в формате {{variable}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, value?.toString() || '');
    }

    // Проверяем, остались ли непроставленные переменные
    const remainingVars = rendered.match(/{{[^}]+}}/g);
    if (remainingVars && remainingVars.length > 0) {
      throw new BadRequestException(
        `Missing variables: ${remainingVars.join(', ')}`
      );
    }

    return rendered;
  }

  /**
   * Извлечение переменных из текста шаблона
   */
  private extractVariables(content: string): string[] {
    const matches = content.match(/{{([^}]+)}}/g);
    if (!matches) return [];

    return matches.map((match) =>
      match.replace(/{{|}}/g, '').trim()
    );
  }

  /**
   * Валидация шаблона
   */
  async validateTemplate(templateId: string, variables: Record<string, any>): Promise<{
    isValid: boolean;
    errors: string[];
    preview: string;
  }> {
    const template = await this.findOne(templateId);
    const errors: string[] = [];

    // Проверяем наличие всех необходимых переменных
    const requiredVars = this.extractVariables(template.content);
    const missingVars = requiredVars.filter((varName) => !(varName in variables));

    if (missingVars.length > 0) {
      errors.push(`Missing required variables: ${missingVars.join(', ')}`);
    }

    let preview = '';
    try {
      preview = this.renderTemplate(template, variables);
    } catch (error) {
      errors.push(error.message);
    }

    return {
      isValid: errors.length === 0,
      errors,
      preview,
    };
  }

  /**
   * Обновление статистики использования шаблона
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    await this.templateRepository.increment(
      { id: templateId },
      'usageCount',
      1
    );
  }

  /**
   * Обновление показателей эффективности
   */
  async updateStats(
    templateId: string,
    stats: {
      deliveryRate?: number;
      responseRate?: number;
    }
  ): Promise<void> {
    await this.templateRepository.update(templateId, stats);
  }

  /**
   * Дублирование шаблона
   */
  async duplicate(id: string, user: User): Promise<SmsTemplate> {
    const original = await this.findOne(id);

    const duplicate = this.templateRepository.create({
      name: `${original.name} (копия)`,
      description: original.description,
      content: original.content,
      category: original.category,
      variables: original.variables,
      isActive: false, // Копия создаётся неактивной
      createdBy: user,
    });

    return await this.templateRepository.save(duplicate);
  }

  /**
   * Получение популярных шаблонов
   */
  async getPopular(limit: number = 10): Promise<SmsTemplate[]> {
    return await this.templateRepository.find({
      where: { isActive: true },
      order: { usageCount: 'DESC' },
      take: limit,
      relations: ['createdBy'],
    });
  }
}
