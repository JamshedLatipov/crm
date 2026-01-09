import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'cdr' })
export class Cdr {

  @ApiProperty({ description: 'Call ID' })
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @ApiProperty({ description: 'Call start date/time' })
  @Column({ type: 'timestamptz', name: 'calldate', default: () => 'CURRENT_TIMESTAMP' })
  calldate!: Date;

  @ApiProperty() @Column({ length: 80, default: '' }) clid!: string;
  @ApiProperty() @Column({ length: 80, default: '' }) src!: string;
  @ApiProperty() @Column({ length: 80, default: '' }) dst!: string;
  @ApiProperty() @Column({ length: 80, default: '' }) dcontext!: string;
  @ApiProperty() @Column({ length: 80, default: '' }) channel!: string;
  @ApiProperty() @Column({ length: 80, default: '' }) dstchannel!: string;
  @ApiProperty() @Column({ length: 80, default: '' }) lastapp!: string;
  @ApiProperty() @Column({ length: 80, default: '' }) lastdata!: string;
  @ApiProperty({ description: 'Total call duration (s)' }) @Column({ type: 'int', default: 0 }) duration!: number;
  @ApiProperty({ description: 'Billed seconds (s)' }) @Column({ type: 'int', default: 0 }) billsec!: number;
  @ApiProperty() @Column({ length: 45, default: '' }) disposition!: string;
  @ApiProperty() @Column({ type: 'int', default: 0 }) amaflags!: number;
  @ApiProperty() @Column({ length: 20, default: '' }) accountcode!: string;
  @Index() @ApiProperty() @Column({ length: 32, default: '' }) uniqueid!: string;
  @ApiProperty() @Column({ length: 255, default: '' }) userfield!: string;
  @ApiProperty() @Column({ type: 'int', default: 0 }) sequence!: number;
}
