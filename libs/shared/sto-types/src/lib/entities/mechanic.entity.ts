import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('mechanics')
export class Mechanic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  pin: string; // Хэшированный PIN

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column('jsonb', { default: [] })
  specializations: string[]; // ['engine', 'transmission', 'electric']

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
