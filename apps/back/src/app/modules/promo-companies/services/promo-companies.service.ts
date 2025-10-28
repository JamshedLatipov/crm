import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromoCompany } from '../entities/promo-company.entity';
import { CreatePromoCompanyDto, UpdatePromoCompanyDto, AddLeadsToPromoCompanyDto, RemoveLeadsFromPromoCompanyDto } from '../dto/promo-company.dto';
import { Lead } from '../../leads/lead.entity';

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
    return this.promoCompanyRepository.find({
      relations: ['leads'],
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
    promoCompany.leads = [...(promoCompany.leads || []), ...leads];
    return this.promoCompanyRepository.save(promoCompany);
  }

  async removeLeads(id: number, removeLeadsDto: RemoveLeadsFromPromoCompanyDto): Promise<PromoCompany> {
    const promoCompany = await this.findOne(id);
    promoCompany.leads = promoCompany.leads.filter(lead => !removeLeadsDto.leadIds.includes(lead.id));
    return this.promoCompanyRepository.save(promoCompany);
  }

  async findLeadsForPromoCompany(id: number): Promise<Lead[]> {
    const promoCompany = await this.findOne(id);
    return promoCompany.leads;
  }
}