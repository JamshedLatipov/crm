import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PsGlobal } from '../entities/ps-global.entity';

@Injectable()
export class PsGlobalService {
  constructor(
    @InjectRepository(PsGlobal)
    private readonly repo: Repository<PsGlobal>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<PsGlobal>) {
    return this.repo.save(this.repo.create(data));
  }

  update(id: string, data: Partial<PsGlobal>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
