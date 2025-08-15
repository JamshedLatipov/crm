import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'ivr_media' })
export class IvrMedia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  name!: string; // logical name

  @Column({ length: 500 })
  filename!: string; // stored filename (with extension)

  @Column({ nullable: true })
  size?: number;

  @CreateDateColumn()
  createdAt!: Date;
}
