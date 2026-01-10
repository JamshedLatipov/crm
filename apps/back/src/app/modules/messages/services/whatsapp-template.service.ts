import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppTemplate } from '../entities/whatsapp-template.entity';
import { CreateTemplateDto, UpdateTemplateDto } from '../dto/template.dto';
import { User } from '../../user/user.entity';
import { PaginationDto, PaginatedResponse } from '../../../common/dto/pagination.dto';

@Injectable()
export class WhatsAppTemplateService {
  constructor(
    @InjectRepository(WhatsAppTemplate)
    private templateRepository: Repository<WhatsAppTemplate>
  ) {}

  /**
   * Создание нового шаблона WhatsApp
   */
  async create(createDto: CreateTemplateDto, user: User): Promise<WhatsAppTemplate> {
    const variables = this.extractVariables(createDto.content);

    const template = this.templateRepository.create({
      ...createDto,
      variables: createDto.variables || variables,
    });

    return await this.templateRepository.save(template);
  }

  /**
   * Получение всех шаблонов с пагинацией
   */
  async findAll(
    paginationDto: PaginationDto,
    filters?: {
      category?: string;
      isActive?: boolean;
      search?: string;
    }
  ): Promise<PaginatedResponse<WhatsAppTemplate>> {
    const { page, limit } = paginationDto;
    
    const query = this.templateRepository.createQueryBuilder('template')
      .orderBy('template.createdAt', 'DESC');

    if (filters?.category) {
      query.andWhere('template.category = :category', { category: filters.category });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('template.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters?.search) {
      query.andWhere(
        '(template.name ILIKE :search OR template.content ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  /**
   * Получение шаблона по ID
   */
  async findOne(id: string): Promise<WhatsAppTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`WhatsApp template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Обновление шаблона
   */
  async update(id: string, updateDto: UpdateTemplateDto): Promise<WhatsAppTemplate> {
    const template = await this.findOne(id);

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
   * Извлечение переменных из контента шаблона
   */
  private extractVariables(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Увеличение счетчика использования шаблона
   */
  async incrementUsageCount(id: string): Promise<void> {
    await this.templateRepository.increment({ id }, 'usageCount', 1);
  }

  /**
   * Дубликат шаблона
   */
  async duplicate(id: string, user: User): Promise<WhatsAppTemplate> {
    const original = await this.findOne(id);

    const duplicate = this.templateRepository.create({
      name: `${original.name} (копия)`,
      content: original.content,
      category: original.category,
      variables: original.variables,
      mediaUrl: original.mediaUrl,
      buttonText: original.buttonText,
      isActive: false,
      metadata: original.metadata,
    });

    return await this.templateRepository.save(duplicate);
  }
}
