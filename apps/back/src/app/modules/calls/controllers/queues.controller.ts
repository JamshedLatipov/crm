import { Controller, Get, Post, Body, Param, Put, Delete, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from '../entities/queue.entity';

@Controller('queues')
export class QueuesController {
  constructor(@InjectRepository(Queue) private repo: Repository<Queue>) {}

  @Get()
  findAll() {
    return this.repo.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const q = await this.repo.findOne({ where: { id: Number(id) } });
    if (!q) throw new NotFoundException('Queue not found');
    return q;
  }

  @Post()
  async create(@Body() body: Partial<Queue>) {
    const ent = this.repo.create(body as any);
    return this.repo.save(ent as any);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Queue>) {
    const q = await this.repo.findOne({ where: { id: Number(id) } });
    if (!q) throw new NotFoundException('Queue not found');
    Object.assign(q, body as any);
    return this.repo.save(q as any);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const q = await this.repo.findOne({ where: { id: Number(id) } });
    if (!q) throw new NotFoundException('Queue not found');
    await this.repo.delete({ id: Number(id) });
    return { ok: true };
  }
}
