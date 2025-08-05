import { ApiProperty } from '@nestjs/swagger';

export class CreateLeadDto {
  @ApiProperty()
  name: string;
  @ApiProperty({ required: false })
  email?: string;
  @ApiProperty({ required: false })
  phone?: string;
  @ApiProperty({ required: false })
  status?: string;
  @ApiProperty({ required: false })
  score?: number;
  @ApiProperty({ required: false })
  source?: string;
  @ApiProperty({ required: false })
  assignedTo?: string;
}

export class UpdateLeadDto {
  @ApiProperty({ required: false })
  name?: string;
  @ApiProperty({ required: false })
  email?: string;
  @ApiProperty({ required: false })
  phone?: string;
  @ApiProperty({ required: false })
  status?: string;
  @ApiProperty({ required: false })
  score?: number;
  @ApiProperty({ required: false })
  source?: string;
  @ApiProperty({ required: false })
  assignedTo?: string;
}

export class AssignLeadDto {
  @ApiProperty()
  user: string;
}

export class ScoreLeadDto {
  @ApiProperty()
  score: number;
}

export class StatusLeadDto {
  @ApiProperty()
  status: string;
}
