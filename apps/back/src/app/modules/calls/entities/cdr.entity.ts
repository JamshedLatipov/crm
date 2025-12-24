import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'cdr' })
export class Cdr {

  @ApiProperty({ description: 'Call ID' })
  @PrimaryColumn({ type: 'int', name: 'id', generated: 'uuid' })
  id!: number;

  @ApiProperty({ description: 'Call start date/time (UTC)' })
  @Column({ type: 'timestamp', name: 'calldate' })
  calldate!: Date;

  @ApiProperty() @Column({ length: 80 }) clid!: string;
  @ApiProperty() @Column({ length: 80 }) src!: string;
  @ApiProperty() @Column({ length: 80 }) dst!: string;
  @ApiProperty() @Column({ length: 80 }) dcontext!: string;
  @ApiProperty() @Column({ length: 80 }) channel!: string;
  @ApiProperty() @Column({ length: 80 }) dstchannel!: string;
  @ApiProperty() @Column({ length: 80 }) lastapp!: string;
  @ApiProperty() @Column({ length: 80 }) lastdata!: string;
  @ApiProperty({ description: 'Total call duration (s)' }) @Column({ type: 'int' }) duration!: number;
  @ApiProperty({ description: 'Billed seconds (s)' }) @Column({ type: 'int' }) billsec!: number;
  @ApiProperty() @Column({ length: 45 }) disposition!: string;
  @ApiProperty() @Column({ type: 'int' }) amaflags!: number;
  @ApiProperty() @Column({ length: 20 }) accountcode!: string;
  @Index() @ApiProperty() @Column({ length: 32 }) uniqueid!: string;
  @ApiProperty() @Column({ length: 255 }) userfield!: string;
  @ApiProperty() @Column({ type: 'int' }) sequence!: number;
}
