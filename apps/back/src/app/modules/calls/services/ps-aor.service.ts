import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PsAor } from '../entities/ps-aor.entity';

@Injectable()
export class PsAorService {
  constructor(
    @InjectRepository(PsAor)
    private readonly repo: Repository<PsAor>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<PsAor>) {
    return this.repo.save(this.repo.create(data));
  }

  update(id: string, data: Partial<PsAor>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
