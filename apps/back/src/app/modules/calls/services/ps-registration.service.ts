import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PsRegistration } from '../entities/ps-registration.entity';

@Injectable()
export class PsRegistrationService {
  constructor(
    @InjectRepository(PsRegistration)
    private readonly repo: Repository<PsRegistration>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<PsRegistration>) {
    return this.repo.save(this.repo.create(data));
  }

  update(id: string, data: Partial<PsRegistration>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
