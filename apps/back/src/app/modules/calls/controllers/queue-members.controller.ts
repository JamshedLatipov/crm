import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  NotFoundException,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueMember } from '../entities/queue-member.entity';
import { ContactCenterService } from '../../contact-center/contact-center.service';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../user/current-user.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';

@Controller('queue-members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class QueueMembersController {
  constructor(
    @InjectRepository(QueueMember) private repo: Repository<QueueMember>,
    private readonly contactCenterSvc: ContactCenterService
  ) {}

  @Get()
  find(@Query('queue_name') queue_name?: string) {
    if (queue_name) return this.repo.find({ where: { queue_name } });
    return this.repo.find();
  }
  @Get('my-state')
  async myState(@CurrentUser() user: CurrentUserPayload) {
    if (!user || !user.operator) return false;
    const userName = user.operator.username;
    
    const m = await this.repo.find({
      where: { member_name: `PJSIP/${userName}` },
    });

    return m.find((member) => member.paused) ?? {paused: false};
  }

  @Get(':id')
  async one(@Param('id', ParseIntPipe) id: number) {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');
    return m;
  }

  @Post()
  async create(@Body() body: Partial<QueueMember>) {
    const ent = this.repo.create(body as any);
    return this.repo.save(ent as any);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<QueueMember>) {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');
    Object.assign(m, body as any);
    return this.repo.save(m as any);
  }


  @Put(':id/pause')
  async pause(
    @Param('id') id: string,
    @Body() body: { paused: boolean; reason_paused?: string | null },
    @CurrentUser() user: CurrentUserPayload
  ) {
    try {
      const userName = user.operator.username;
      const m = await this.repo.find({
        where: { member_name: `PJSIP/${userName}` },
      });

      m.forEach(async (member) => {
        const prevPaused = Boolean(member.paused);
        const prevReason = member.reason_paused;
        if (prevPaused !== body.paused || prevReason !== body.reason_paused) {
          member.paused = !!body.paused;
          member.reason_paused = body.reason_paused ?? null;
          await this.repo.save(member as any);
        }
      });

      return true;
    } catch (err) {
      console.error('Error updating pause status for user', err);
      throw err;
    }
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const m = await this.repo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Member not found');
    await this.repo.delete({ id });
    return { ok: true };
  }

 
}
