import { Controller, Get } from '@nestjs/common';
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
}
