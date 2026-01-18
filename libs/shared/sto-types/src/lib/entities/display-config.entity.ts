import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('display_configs')
export class DisplayConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // "Табло приёмки"

  @Column({ nullable: true })
  location: string; // "Зона ожидания, 1 этаж"

  @Column('jsonb')
  filters: {
    zones: string[];
    workTypes?: string[];
    showBlocked: boolean;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
