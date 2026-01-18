import { IsString, IsArray, IsBoolean, IsInt, IsOptional } from 'class-validator';

export class CreateDisplayConfigDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsArray()
  @IsString({ each: true })
  zones: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workTypes?: string[];

  @IsBoolean()
  showBlocked: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
