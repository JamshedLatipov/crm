import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  ParseIntPipe,
  UseGuards,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import {
  SERVICES,
  IDENTITY_PATTERNS,
  CreateUserDto,
  UpdateUserDto,
  PaginationQueryDto,
  UserDto,
  PaginatedResponseDto,
} from '@crm/contracts';
import { AuthGuard } from '../auth/auth.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    @Inject(SERVICES.IDENTITY) private readonly identityClient: ClientProxy,
  ) {}

  @Get()
  async findAll(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<UserDto>> {
    return this.send(IDENTITY_PATTERNS.GET_USERS, query);
  }

  @Get('managers')
  async getManagers(@Query('availableOnly') availableOnly?: string): Promise<UserDto[]> {
    return this.send(IDENTITY_PATTERNS.GET_MANAGERS, { availableOnly: availableOnly === 'true' });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    const user = await this.send<UserDto | null>(IDENTITY_PATTERNS.GET_USER, { id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserDto> {
    return this.send(IDENTITY_PATTERNS.CREATE_USER, dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto
  ): Promise<UserDto> {
    return this.send(IDENTITY_PATTERNS.UPDATE_USER, { id, dto });
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.send(IDENTITY_PATTERNS.DELETE_USER, { id });
  }

  private async send<T>(pattern: string, data: unknown): Promise<T> {
    return firstValueFrom(
      this.identityClient.send<T>(pattern, data).pipe(
        timeout(5000),
        catchError(err => {
          this.logger.error(`RPC ${pattern} failed:`, err);
          throw err;
        })
      )
    );
  }
}
