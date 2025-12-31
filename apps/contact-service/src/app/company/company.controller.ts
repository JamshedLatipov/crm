import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CompanyService, CreateCompanyDto, UpdateCompanyDto, CompanyFilterDto } from './company.service';
import { CONTACT_PATTERNS } from '@crm/contracts';

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // ============ HTTP Endpoints ============

  @Get()
  findAll(@Query() filter: CompanyFilterDto) {
    return this.companyService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companyService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.companyService.remove(id);
  }

  // ============ RabbitMQ Message Handlers ============

  @MessagePattern(CONTACT_PATTERNS.GET_COMPANIES)
  handleGetCompanies(@Payload() filter: CompanyFilterDto) {
    return this.companyService.findAll(filter);
  }

  @MessagePattern(CONTACT_PATTERNS.GET_COMPANY)
  handleGetCompany(@Payload() data: { id: string }) {
    return this.companyService.findOne(data.id);
  }

  @MessagePattern(CONTACT_PATTERNS.CREATE_COMPANY)
  handleCreate(@Payload() dto: CreateCompanyDto) {
    return this.companyService.create(dto);
  }

  @MessagePattern(CONTACT_PATTERNS.UPDATE_COMPANY)
  handleUpdate(@Payload() data: { id: string; dto: UpdateCompanyDto }) {
    return this.companyService.update(data.id, data.dto);
  }

  @MessagePattern(CONTACT_PATTERNS.DELETE_COMPANY)
  handleDelete(@Payload() data: { id: string }) {
    return this.companyService.remove(data.id);
  }
}
