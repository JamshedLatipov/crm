import { Entity, PrimaryColumn } from 'typeorm';

@Entity('ps_registrations')
export class PsRegistration {
  @PrimaryColumn({ length: 40 })
  id: string;
}
