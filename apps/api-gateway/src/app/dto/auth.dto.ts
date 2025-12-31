import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsArray, MinLength } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    description: 'Username or email',
    example: 'john.doe',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class LoginResponseUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'john.doe' })
  username: string;

  @ApiProperty({ example: ['manager'] })
  roles: string[];

  @ApiPropertyOptional({ example: 'John' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;
}

export class SipCredentialsDto {
  @ApiProperty({ example: '1001' })
  username: string;

  @ApiProperty({ example: 'sippass123' })
  password: string;
}

export class LoginSuccessResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({ type: LoginResponseUserDto })
  user: LoginResponseUserDto;

  @ApiPropertyOptional({ type: SipCredentialsDto })
  sip?: SipCredentialsDto;
}

export class RegisterRequestDto {
  @ApiProperty({
    description: 'Unique username',
    example: 'jane.doe',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Password (min 6 characters)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'User roles',
    example: ['operator'],
    isArray: true,
  })
  @IsArray()
  @IsNotEmpty()
  roles: string[];

  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'jane.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class ValidateTokenRequestDto {
  @ApiProperty({
    description: 'JWT token to validate',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ValidateTokenResponseDto {
  @ApiProperty({
    description: 'Whether the token is valid',
    example: true,
  })
  valid: boolean;

  @ApiPropertyOptional({
    description: 'Token payload if valid',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  payload: Record<string, unknown> | null;
}
