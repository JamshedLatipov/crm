import { Controller, Get, Post, Body, Param, Put, Delete, Query, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueMember } from '../entities/queue-member.entity';

@Controller('queue-members')
export class QueueMembersController {
  constructor(@InjectRepository(QueueMember) private repo: Repository<QueueMember>) {}

  @Get()
  find(@Query('queue_name') queue_name?: string) {
    if (queue_name) return this.repo.find({ where: { queue_name } });
    return this.repo.find();
  }

  @Get(':id')
  async one(@Param('id') id: string) {
    const m = await this.repo.findOne({ where: { id: Number(id) } });
    if (!m) throw new NotFoundException('Member not found');
    return m;
  }

  @Post()
  async create(@Body() body: Partial<QueueMember>) {
    const ent = this.repo.create(body as any);
    return this.repo.save(ent as any);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<QueueMember>) {
    const m = await this.repo.findOne({ where: { id: Number(id) } });
    if (!m) throw new NotFoundException('Member not found');
    Object.assign(m, body as any);
    return this.repo.save(m as any);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const m = await this.repo.findOne({ where: { id: Number(id) } });
    if (!m) throw new NotFoundException('Member not found');
    await this.repo.delete({ id: Number(id) });
    return { ok: true };
  }
}
