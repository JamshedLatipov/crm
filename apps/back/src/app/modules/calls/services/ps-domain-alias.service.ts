import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PsDomainAlias } from '../entities/ps-domain-alias.entity';

@Injectable()
export class PsDomainAliasService {
  constructor(
    @InjectRepository(PsDomainAlias)
    private readonly repo: Repository<PsDomainAlias>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<PsDomainAlias>) {
    return this.repo.save(this.repo.create(data));
  }

  update(id: string, data: Partial<PsDomainAlias>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
