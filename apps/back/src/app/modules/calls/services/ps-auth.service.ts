import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PsAuth } from '../entities/ps-auth.entity';

@Injectable()
export class PsAuthService {
  constructor(
    @InjectRepository(PsAuth)
    private readonly repo: Repository<PsAuth>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<PsAuth>) {
    return this.repo.save(this.repo.create(data));
  }

  update(id: string, data: Partial<PsAuth>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
