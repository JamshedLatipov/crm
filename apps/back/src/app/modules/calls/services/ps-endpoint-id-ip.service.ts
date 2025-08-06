import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PsEndpointIdIp } from '../entities/ps-endpoint-id-ip.entity';

@Injectable()
export class PsEndpointIdIpService {
  constructor(
    @InjectRepository(PsEndpointIdIp)
    private readonly repo: Repository<PsEndpointIdIp>,
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<PsEndpointIdIp>) {
    return this.repo.save(this.repo.create(data));
  }

  update(id: string, data: Partial<PsEndpointIdIp>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
