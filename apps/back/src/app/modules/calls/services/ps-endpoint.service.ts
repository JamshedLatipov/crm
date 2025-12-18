import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PsEndpoint } from '../entities/ps-endpoint.entity';
import { PsAor } from '../entities/ps-aor.entity';
import { PsAuth } from '../entities/ps-auth.entity';

@Injectable()
export class PsEndpointService {
  constructor(
    @InjectRepository(PsEndpoint)
    private readonly repo: Repository<PsEndpoint>
  ) {}

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<PsEndpoint>) {
    // Create endpoint along with corresponding ps_aors and ps_auths records in a transaction
    return this.repo.manager.transaction(async (em) => {
      const fromDomain = data.from_domain || process.env.ASTERISK_HOST;

      const endpoint = em.create(PsEndpoint, {
        ...data,
        from_domain: fromDomain,
        dtmf_mode: 'rfc4733',
        direct_media: 'no',
        rewrite_contact: 'yes',
      });
      const saved = await em.save(endpoint);

      const aorId = saved.id;
      const authId = saved.id;

      // create or update AOR
      try {
        const aorRepo = em.getRepository(PsAor);
        const aor = aorRepo.create({
          id: aorId,
          max_contacts: 1,
          remove_existing: 'yes',
        });
        await aorRepo.save(aor);
      } catch (err) {
        // swallow - endpoint creation should not fail because of AOR issues
      }

      // create or update Auth
      try {
        const authRepo = em.getRepository(PsAuth);
        const auth = authRepo.create({
          id: authId,
          auth_type: 'userpass',
          username: authId,
          password: (data as any).auth_password || '',
        });
        await authRepo.save(auth);
      } catch (err) {
        // swallow
      }

      return saved;
    });
  }

  update(id: string, data: Partial<PsEndpoint>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    // Remove endpoint and its related ps_aors and ps_auths in a single transaction
    return this.repo.manager.transaction(async (em) => {
      try {
        await em.getRepository(PsAuth).delete({ id });
      } catch (err) {
        // swallow individual errors
      }

      try {
        await em.getRepository(PsAor).delete({ id });
      } catch (err) {
        // swallow
      }

      return em.getRepository(PsEndpoint).delete({ id });
    });
  }
}
