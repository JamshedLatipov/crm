import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('queues')
export class Queue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ length: 40, nullable: true })
  context?: string | null;

  @Column({ length: 40, nullable: true })
  strategy?: string | null;

  @Column({ length: 40, nullable: true })
  musicclass?: string | null;

  @Column({ type: 'int', default: 0 })
  maxlen?: number;

  @Column({ type: 'int', default: 15 })
  timeout?: number;

  // Additional common Asterisk queue fields
  @Column({ type: 'int', default: 0 })
  retry?: number;

  @Column({ type: 'int', default: 0 })
  wrapuptime?: number;

  @Column({ type: 'int', default: 0 })
  announce_frequency?: number;

  @Column({ type: 'boolean', default: true })
  joinempty?: boolean;

  @Column({ type: 'boolean', default: true })
  leavewhenempty?: boolean;

  @Column({ type: 'boolean', default: false })
  ringinuse?: boolean;
}
