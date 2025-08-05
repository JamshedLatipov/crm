import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { LeadService } from './lead.service';
import { Lead } from './lead.entity';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { CreateLeadDto, UpdateLeadDto, AssignLeadDto, ScoreLeadDto, StatusLeadDto } from './lead.dto';

@ApiTags('leads')
@Controller('leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @ApiBody({ type: CreateLeadDto })
  async create(@Body() data: CreateLeadDto): Promise<Lead> {
    return this.leadService.create(data);
  }

  @Get()
  async findAll(): Promise<Lead[]> {
    return this.leadService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: number): Promise<Lead | null> {
    return this.leadService.findById(id);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateLeadDto })
  async update(@Param('id') id: number, @Body() data: UpdateLeadDto): Promise<Lead> {
    return this.leadService.update(id, data);
  }

  @Patch(':id/assign')
  @ApiBody({ type: AssignLeadDto })
  async assignLead(@Param('id') id: number, @Body() body: AssignLeadDto): Promise<Lead> {
    return this.leadService.assignLead(id, body.user);
  }

  @Patch(':id/score')
  @ApiBody({ type: ScoreLeadDto })
  async scoreLead(@Param('id') id: number, @Body() body: ScoreLeadDto): Promise<Lead> {
    return this.leadService.scoreLead(id, body.score);
  }

  @Patch(':id/status')
  @ApiBody({ type: StatusLeadDto })
  async changeStatus(@Param('id') id: number, @Body() body: StatusLeadDto): Promise<Lead> {
    return this.leadService.changeStatus(id, body.status);
  }
}
