import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PsEndpoint } from '../entities/ps-endpoint.entity';

@Injectable()
export class PsEndpointService {
  constructor(
    @InjectRepository(PsEndpoint)
    private readonly repo: Repository<PsEndpoint>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<PsEndpoint>) {
    return this.repo.save(this.repo.create(data));
  }

  update(id: string, data: Partial<PsEndpoint>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
