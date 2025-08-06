import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PsQualify } from '../entities/ps-qualify.entity';

@Injectable()
export class PsQualifyService {
  constructor(
    @InjectRepository(PsQualify)
    private readonly repo: Repository<PsQualify>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<PsQualify>) {
    return this.repo.save(this.repo.create(data));
  }

  update(id: string, data: Partial<PsQualify>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
