import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PromoCompaniesService } from '../services/promo-companies.service';
import { CreatePromoCompanyDto, UpdatePromoCompanyDto, AddLeadsToPromoCompanyDto, RemoveLeadsFromPromoCompanyDto } from '../dto/promo-company.dto';
import { PromoCompany } from '../entities/promo-company.entity';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';

@ApiTags('promo-companies')
@Controller('promo-companies')
// @UseGuards(JwtAuthGuard)
export class PromoCompaniesController {
  constructor(private readonly promoCompaniesService: PromoCompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new promo company' })
  @ApiResponse({ status: 201, description: 'The promo company has been successfully created.', type: PromoCompany })
  create(@Body() createPromoCompanyDto: CreatePromoCompanyDto): Promise<PromoCompany> {
    return this.promoCompaniesService.create(createPromoCompanyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all promo companies' })
  @ApiResponse({ status: 200, description: 'Return all promo companies.', type: [PromoCompany] })
  findAll(): Promise<PromoCompany[]> {
    return this.promoCompaniesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a promo company by id' })
  @ApiResponse({ status: 200, description: 'Return the promo company.', type: PromoCompany })
  @ApiResponse({ status: 404, description: 'Promo company not found.' })
  findOne(@Param('id') id: string): Promise<PromoCompany> {
    return this.promoCompaniesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a promo company' })
  @ApiResponse({ status: 200, description: 'The promo company has been successfully updated.', type: PromoCompany })
  update(@Param('id') id: string, @Body() updatePromoCompanyDto: UpdatePromoCompanyDto): Promise<PromoCompany> {
    return this.promoCompaniesService.update(+id, updatePromoCompanyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a promo company' })
  @ApiResponse({ status: 200, description: 'The promo company has been successfully deleted.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.promoCompaniesService.remove(+id);
  }

  @Post(':id/leads')
  @ApiOperation({ summary: 'Add leads to a promo company' })
  @ApiResponse({ status: 200, description: 'Leads have been successfully added.', type: PromoCompany })
  addLeads(@Param('id') id: string, @Body() addLeadsDto: AddLeadsToPromoCompanyDto): Promise<PromoCompany> {
    return this.promoCompaniesService.addLeads(+id, addLeadsDto);
  }

  @Delete(':id/leads')
  @ApiOperation({ summary: 'Remove leads from a promo company' })
  @ApiResponse({ status: 200, description: 'Leads have been successfully removed.', type: PromoCompany })
  removeLeads(@Param('id') id: string, @Body() removeLeadsDto: RemoveLeadsFromPromoCompanyDto): Promise<PromoCompany> {
    return this.promoCompaniesService.removeLeads(+id, removeLeadsDto);
  }

  @Get(':id/leads')
  @ApiOperation({ summary: 'Get leads for a promo company' })
  @ApiResponse({ status: 200, description: 'Return leads for the promo company.' })
  findLeads(@Param('id') id: string) {
    return this.promoCompaniesService.findLeadsForPromoCompany(+id);
  }
}