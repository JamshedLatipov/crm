import { IsString, IsArray, IsBoolean, IsInt, IsOptional } from 'class-validator';

export class UpdateDisplayConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  zones?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workTypes?: string[];

  @IsOptional()
  @IsBoolean()
  showBlocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
