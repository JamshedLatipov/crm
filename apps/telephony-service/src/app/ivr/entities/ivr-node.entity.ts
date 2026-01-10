import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';

export type IvrActionType =
  | 'playback'
  | 'dial'
  | 'hangup'
  | 'goto'
  | 'menu'
  | 'queue';

@Entity('ivr_nodes')
export class IvrNode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 100 })
  name!: string;

  @ManyToOne(() => IvrNode, (n) => n.children, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent?: IvrNode | null;

  @Column({ name: 'parentId', type: 'uuid', nullable: true })
  @Index()
  parentId?: string | null;

  @OneToMany(() => IvrNode, (n) => n.parent)
  children?: IvrNode[];

  @Column({ length: 5, nullable: true })
  digit?: string | null;

  @Column({ type: 'varchar', length: 20 })
  action!: IvrActionType;

  @Column({ type: 'text', nullable: true })
  payload?: string | null;

  @Column({ type: 'text', nullable: true })
  webhookUrl?: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  webhookMethod?: string | null;

  @Column({ type: 'text', nullable: true })
  ttsText?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  queueName?: string | null;

  @Column({ type: 'int', default: 0 })
  order!: number;

  @Column({ type: 'int', default: 5000 })
  timeoutMs!: number;

  @Column({ length: 5, nullable: true })
  backDigit?: string | null;

  @Column({ type: 'boolean', default: true })
  allowEarlyDtmf!: boolean;

  @Column({ length: 5, nullable: true })
  repeatDigit?: string | null;

  @Column({ length: 5, nullable: true })
  rootDigit?: string | null;
}
