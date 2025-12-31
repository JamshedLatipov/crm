import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template, TemplateType } from '../campaign/entities/template.entity';

export interface CreateTemplateDto {
  name: string;
  description?: string;
  type: TemplateType;
  subject?: string;
  body: string;
  htmlBody?: string;
  variables?: string[];
  createdBy?: number;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  subject?: string;
  body?: string;
  htmlBody?: string;
  variables?: string[];
  isActive?: boolean;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
  ) {}

  async findAll(type?: TemplateType) {
    const query = this.templateRepository.createQueryBuilder('template')
      .where('template.isActive = :active', { active: true });

    if (type) {
      query.andWhere('template.type = :type', { type });
    }

    return query.orderBy('template.name', 'ASC').getMany();
  }

  async findOne(id: number) {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  async create(dto: CreateTemplateDto) {
    const template = this.templateRepository.create({
      name: dto.name,
      description: dto.description,
      type: dto.type,
      subject: dto.subject,
      body: dto.body,
      htmlBody: dto.htmlBody,
      variables: dto.variables,
      createdBy: dto.createdBy,
      isActive: true,
    });

    return this.templateRepository.save(template);
  }

  async update(id: number, dto: UpdateTemplateDto) {
    const template = await this.findOne(id);
    Object.assign(template, dto);
    return this.templateRepository.save(template);
  }

  async delete(id: number) {
    const template = await this.findOne(id);
    template.isActive = false;
    return this.templateRepository.save(template);
  }

  async preview(id: number, data: Record<string, string>) {
    const template = await this.findOne(id);
    
    let body = template.body;
    let htmlBody = template.htmlBody || '';
    let subject = template.subject || '';

    // Replace variables
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      body = body.replace(regex, value);
      htmlBody = htmlBody.replace(regex, value);
      subject = subject.replace(regex, value);
    }

    return {
      subject,
      body,
      htmlBody,
    };
  }

  async duplicate(id: number, newName: string) {
    const template = await this.findOne(id);
    
    const duplicate = this.templateRepository.create({
      ...template,
      id: undefined,
      name: newName,
      createdAt: undefined,
      updatedAt: undefined,
    });

    return this.templateRepository.save(duplicate);
  }
}
