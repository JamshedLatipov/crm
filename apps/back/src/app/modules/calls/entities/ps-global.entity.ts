import { Entity, PrimaryColumn } from 'typeorm';

@Entity('ps_globals')
export class PsGlobal {
  @PrimaryColumn({ length: 40 })
  id: string;
}
