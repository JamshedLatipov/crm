import { IsOptional, IsString } from 'class-validator';

export class AdsWebhookDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  campaign?: string;

  // other fields are accepted as free-form
}
