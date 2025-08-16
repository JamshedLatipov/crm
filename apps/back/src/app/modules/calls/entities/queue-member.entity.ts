import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('queue_members')
export class QueueMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'queue_name', type: 'text' })
  queue_name: string;

  @Column({ type: 'text' })
  member_name: string; // e.g., PJSIP/1001 or operator1

  @Column({ type: 'int', default: 0 })
  penalty?: number;

  @Column({ type: 'boolean', default: false })
  paused?: boolean;

  @Column({ type: 'text', nullable: true })
  memberid?: string | null;

  @Column({ type: 'text', nullable: true, name: 'member_interface' })
  member_interface?: string | null;

  // Asterisk `res_config_odbc` sometimes expects a column named `interface`.
  // Use a safe TS property name and map it to the DB column.
  @Column({ type: 'text', nullable: true, name: 'interface' })
  iface?: string | null;

  // Realtime columns expected by Asterisk/res_config (added by migration)
  @Column({ type: 'text', nullable: true })
  uniqueid?: string | null;

  @Column({ type: 'text', nullable: true, name: 'reason_paused' })
  reason_paused?: string | null;

  @Column({ length: 40, nullable: true })
  member_type?: string | null;
}
