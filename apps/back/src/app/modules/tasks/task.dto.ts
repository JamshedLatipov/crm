import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty()
  title: string;
  
  @ApiProperty({ required: false })
  description?: string;
  
  @ApiProperty({ required: false })
  assignedToId?: number;
  
  @ApiProperty({ required: false })
  status?: string;
  
  @ApiProperty({ required: false })
  dueDate?: Date;

  @ApiProperty({ required: false, description: 'ID лида, к которому привязана задача' })
  leadId?: number;

  @ApiProperty({ required: false, description: 'ID сделки, к которой привязана задача' })
  dealId?: string;
}

export class UpdateTaskDto {
  @ApiProperty({ required: false })
  title?: string;
  
  @ApiProperty({ required: false })
  description?: string;
  
  @ApiProperty({ required: false })
  assignedToId?: number;
  
  @ApiProperty({ required: false })
  status?: string;
  
  @ApiProperty({ required: false })
  dueDate?: Date;

  @ApiProperty({ required: false })
  leadId?: number;

  @ApiProperty({ required: false })
  dealId?: string;
}
