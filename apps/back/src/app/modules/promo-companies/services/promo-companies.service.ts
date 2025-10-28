import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { PromoCompany } from '../entities/promo-company.entity';
import { CreatePromoCompanyDto, UpdatePromoCompanyDto, AddLeadsToPromoCompanyDto, RemoveLeadsFromPromoCompanyDto } from '../dto/promo-company.dto';
import { Lead, LeadStatus } from '../../leads/lead.entity';

@Injectable()
export class PromoCompaniesService {
  constructor(
    @InjectRepository(PromoCompany)
    private readonly promoCompanyRepository: Repository<PromoCompany>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
  ) {}

  async create(createDto: CreatePromoCompanyDto): Promise<PromoCompany> {
    const promoCompany = this.promoCompanyRepository.create(createDto);
    return this.promoCompanyRepository.save(promoCompany);
  }

  async findAll(): Promise<PromoCompany[]> {
    const promoCompanies = await this.promoCompanyRepository.find({
      relations: ['leads'],
    });
    
    // Фильтруем конвертированные лиды для каждой промо-компании
    return promoCompanies.map(promoCompany => {
      promoCompany.leads = promoCompany.leads.filter(lead => 
        lead.promoCompanyId === promoCompany.id && lead.status !== 'converted'
      );
      return promoCompany;
    });
  }

  async findOne(id: number): Promise<PromoCompany> {
    const promoCompany = await this.promoCompanyRepository.findOne({
      where: { id },
      relations: ['leads'],
    });
    if (!promoCompany) {
      throw new NotFoundException(`PromoCompany with ID ${id} not found`);
    }
    // Фильтруем лиды, у которых promoCompanyId соответствует и статус не "converted"
    promoCompany.leads = promoCompany.leads.filter(lead => lead.promoCompanyId === id && lead.status !== 'converted');
    return promoCompany;
  }

  async update(id: number, updateDto: UpdatePromoCompanyDto): Promise<PromoCompany> {
    const promoCompany = await this.findOne(id);
    Object.assign(promoCompany, updateDto);
    return this.promoCompanyRepository.save(promoCompany);
  }

  async remove(id: number): Promise<void> {
    const promoCompany = await this.findOne(id);
    await this.promoCompanyRepository.remove(promoCompany);
  }

  async addLeads(id: number, addLeadsDto: AddLeadsToPromoCompanyDto): Promise<PromoCompany> {
    const promoCompany = await this.findOne(id);
    const leads = await this.leadRepository.findByIds(addLeadsDto.leadIds);
    
    // Обновляем promoCompanyId для лидов
    for (const lead of leads) {
      await this.leadRepository.update(lead.id, { promoCompanyId: id });
    }
    
    // Обновляем leadsReached на основе количества активных лидов с promoCompanyId
    const leadsCount = await this.leadRepository.count({ 
      where: { 
        promoCompanyId: id,
        status: Not(LeadStatus.CONVERTED)
      } 
    });
    promoCompany.leadsReached = leadsCount;
    
    return this.promoCompanyRepository.save(promoCompany);
  }

  async removeLeads(id: number, removeLeadsDto: RemoveLeadsFromPromoCompanyDto): Promise<PromoCompany> {
    const promoCompany = await this.findOne(id);
    const leads = await this.leadRepository.findByIds(removeLeadsDto.leadIds);
    
    // Убираем promoCompanyId у лидов
    for (const lead of leads) {
      await this.leadRepository.update(lead.id, { promoCompanyId: null });
    }
    
    // Обновляем leadsReached на основе количества активных лидов с promoCompanyId
    const leadsCount = await this.leadRepository.count({ 
      where: { 
        promoCompanyId: id,
        status: Not(LeadStatus.CONVERTED)
      } 
    });
    promoCompany.leadsReached = leadsCount;
    
    return this.promoCompanyRepository.save(promoCompany);
  }

  async findLeadsForPromoCompany(id: number): Promise<Lead[]> {
    const promoCompany = await this.findOne(id);
    return promoCompany.leads;
  }
}