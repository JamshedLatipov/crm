import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';

export type IvrActionType = 'playback' | 'dial' | 'hangup' | 'goto' | 'menu' | 'queue';

@Entity('ivr_nodes')
export class IvrNode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 100 })
  name!: string;

  // Relation to parent; use the same physical column 'parentId'
  @ManyToOne(() => IvrNode, n => n.children, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent?: IvrNode | null;

  // Explicit join column for direct access without loading relation
  @Column({ name: 'parentId', type: 'uuid', nullable: true })
  @Index()
  parentId?: string | null;

  @OneToMany(() => IvrNode, n => n.parent)
  children?: IvrNode[];

  // DTMF digit (0-9,*,#) that triggers this node when pressed at parent menu
  @Column({ length: 5, nullable: true })
  digit?: string | null;

  // Action type
  @Column({ type: 'varchar', length: 20 })
  action!: IvrActionType;

  // Action payload (sound file name, dialed endpoint, target node, etc.)
  @Column({ type: 'text', nullable: true })
  payload?: string | null;

  // Optional webhook to call upon entering/executing this node
  @Column({ type: 'text', nullable: true })
  webhookUrl?: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  webhookMethod?: string | null; // e.g. GET / POST

  // Optional TTS text (future use if integrating TTS)
  @Column({ type: 'text', nullable: true })
  ttsText?: string | null;

  // Order within siblings
  @Column({ type: 'int', default: 0 })
  order!: number;

  // Timeout to wait for DTMF (ms) for menu nodes
  @Column({ type: 'int', default: 5000 })
  timeoutMs!: number;

  // Digit to go back to parent (effective only for menu nodes). If null — общая цифра 0 по умолчанию.
  @Column({ length: 5, nullable: true })
  backDigit?: string | null;

  // Allow accepting DTMF during prompt playback (menu/prompt nodes)
  @Column({ type: 'boolean', default: true })
  allowEarlyDtmf!: boolean;

  // Digit to repeat current menu (replay prompt). Only for menu nodes.
  @Column({ length: 5, nullable: true })
  repeatDigit?: string | null;

  // Digit to jump back to root menu quickly.
  @Column({ length: 5, nullable: true })
  rootDigit?: string | null;
}
