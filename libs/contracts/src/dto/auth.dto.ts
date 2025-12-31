/**
 * Authentication DTOs for Identity Service
 */

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponseDto {
  access_token: string;
  user: {
    id: number;
    username: string;
    roles: string[];
    firstName?: string;
    lastName?: string;
  };
  sip?: {
    username: string;
    password: string;
  };
}

export interface RegisterDto {
  username: string;
  password: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface ValidateTokenDto {
  token: string;
}

export interface TokenPayloadDto {
  sub: number; // User ID
  username: string;
  roles: string[];
  operator?: {
    username: string;
    password: string;
  };
  iat?: number;
  exp?: number;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface RefreshTokenResponseDto {
  access_token: string;
  refresh_token?: string;
}

/**
 * Service-to-service authentication
 */
export interface ServiceTokenDto {
  service: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export interface ValidateServiceTokenDto {
  token: string;
  requiredPermission?: string;
}
