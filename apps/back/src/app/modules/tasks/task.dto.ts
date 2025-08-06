import { ApiProperty } from '@nestjs/swagger';
import { User } from '../user/user.entity';

export class CreateTaskDto {
  @ApiProperty()
  title: string;
  @ApiProperty({ required: false })
  description?: string;
  @ApiProperty()
  assignedTo: User;
  @ApiProperty({ required: false })
  dueDate?: Date;
}

export class UpdateTaskDto {
  @ApiProperty({ required: false })
  title?: string;
  @ApiProperty({ required: false })
  description?: string;
  @ApiProperty({ required: false })
  assignedTo?: User;
  @ApiProperty({ required: false })
  status?: string;
  @ApiProperty({ required: false })
  dueDate?: Date;
}
