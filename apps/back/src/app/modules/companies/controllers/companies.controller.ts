import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CompaniesService } from '../services/companies.service';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CompanyFilters } from '../services/companies.service';
import { Company, CompanyType, CompanySize, Industry } from '../entities/company.entity';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created successfully', type: Company })
  create(@Body() createCompanyDto: CreateCompanyDto): Promise<Company> {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies with optional filters' })
  @ApiResponse({ status: 200, description: 'List of companies', type: [Company] })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, description, address' })
  @ApiQuery({ name: 'type', required: false, enum: CompanyType })
  @ApiQuery({ name: 'industry', required: false, enum: Industry })
  @ApiQuery({ name: 'size', required: false, enum: CompanySize })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isBlacklisted', required: false, type: Boolean })
  @ApiQuery({ name: 'ownerId', required: false })
  findAll(@Query() filters: CompanyFilters): Promise<Company[]> {
    return this.companiesService.findAll(filters);
  }

  @Get('inactive')
  @ApiOperation({ summary: 'Get inactive companies' })
  @ApiResponse({ status: 200, description: 'List of inactive companies', type: [Company] })
  @ApiQuery({ name: 'days', required: false, description: 'Days since last activity (default: 90)' })
  findInactive(@Query('days') days?: number): Promise<Company[]> {
    return this.companiesService.findInactive(days);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search companies by various criteria' })
  @ApiResponse({ status: 200, description: 'Search results', type: [Company] })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  search(@Query('q') query: string): Promise<Company[]> {
    return this.companiesService.findAll({ search: query });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get company statistics' })
  @ApiResponse({ status: 200, description: 'Company statistics' })
  getStats() {
    return this.companiesService.getCompanyStats();
  }

  @Get('duplicates')
  @ApiOperation({ summary: 'Find duplicate companies' })
  @ApiResponse({ status: 200, description: 'List of potential duplicates' })
  findDuplicates() {
    return this.companiesService.findDuplicates();
  }

  @Get('by-inn/:inn')
  @ApiOperation({ summary: 'Find companies by INN' })
  @ApiResponse({ status: 200, description: 'Companies with matching INN', type: [Company] })
  findByInn(@Param('inn') inn: string): Promise<Company[]> {
    return this.companiesService.findByInn(inn);
  }

  @Get('by-industry/:industry')
  @ApiOperation({ summary: 'Get companies by industry' })
  @ApiResponse({ status: 200, description: 'Companies in industry', type: [Company] })
  findByIndustry(@Param('industry') industry: Industry): Promise<Company[]> {
    return this.companiesService.findByIndustry(industry);
  }

  @Get('by-size/:size')
  @ApiOperation({ summary: 'Get companies by size' })
  @ApiResponse({ status: 200, description: 'Companies of specific size', type: [Company] })
  findBySize(@Param('size') size: CompanySize): Promise<Company[]> {
    return this.companiesService.findBySize(size);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiResponse({ status: 200, description: 'Company found', type: Company })
  @ApiResponse({ status: 404, description: 'Company not found' })
  findOne(@Param('id') id: string): Promise<Company> {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update company' })
  @ApiResponse({ status: 200, description: 'Company updated', type: Company })
  @ApiResponse({ status: 404, description: 'Company not found' })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete company' })
  @ApiResponse({ status: 200, description: 'Company deleted' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.companiesService.remove(id);
  }

  @Patch(':id/blacklist')
  @ApiOperation({ summary: 'Add company to blacklist' })
  @ApiResponse({ status: 200, description: 'Company blacklisted', type: Company })
  addToBlacklist(
    @Param('id') id: string, 
    @Body('reason') reason: string
  ): Promise<Company> {
    return this.companiesService.addToBlacklist(id, reason);
  }

  @Patch(':id/unblacklist')
  @ApiOperation({ summary: 'Remove company from blacklist' })
  @ApiResponse({ status: 200, description: 'Company removed from blacklist', type: Company })
  removeFromBlacklist(@Param('id') id: string): Promise<Company> {
    return this.companiesService.removeFromBlacklist(id);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign owner to company' })
  @ApiResponse({ status: 200, description: 'Owner assigned', type: Company })
  assignOwner(
    @Param('id') id: string,
    @Body('ownerId') ownerId: string
  ): Promise<Company> {
    return this.companiesService.assignOwner(id, ownerId);
  }

  @Patch(':id/touch')
  @ApiOperation({ summary: 'Update last activity date' })
  @ApiResponse({ status: 200, description: 'Activity updated', type: Company })
  touchActivity(@Param('id') id: string): Promise<Company> {
    return this.companiesService.touchActivity(id);
  }

  @Patch(':id/rating')
  @ApiOperation({ summary: 'Update company rating' })
  @ApiResponse({ status: 200, description: 'Rating updated', type: Company })
  updateRating(
    @Param('id') id: string,
    @Body('rating') rating: number
  ): Promise<Company> {
    return this.companiesService.updateRating(id, rating);
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Add tags to company' })
  @ApiResponse({ status: 200, description: 'Tags added', type: Company })
  addTags(
    @Param('id') id: string,
    @Body('tags') tags: string[]
  ): Promise<Company> {
    return this.companiesService.addTags(id, tags);
  }

  @Delete(':id/tags')
  @ApiOperation({ summary: 'Remove tags from company' })
  @ApiResponse({ status: 200, description: 'Tags removed', type: Company })
  removeTags(
    @Param('id') id: string,
    @Body('tags') tags: string[]
  ): Promise<Company> {
    return this.companiesService.removeTags(id, tags);
  }
}
