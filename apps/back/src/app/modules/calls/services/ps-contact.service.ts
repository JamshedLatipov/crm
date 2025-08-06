import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PsContact } from '../entities/ps-contact.entity';

@Injectable()
export class PsContactService {
  constructor(
    @InjectRepository(PsContact)
    private readonly repo: Repository<PsContact>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<PsContact>) {
    return this.repo.save(this.repo.create(data));
  }

  update(id: string, data: Partial<PsContact>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
