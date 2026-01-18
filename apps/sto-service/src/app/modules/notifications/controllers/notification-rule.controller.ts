import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  StoNotificationRule,
  CreateNotificationRuleDto,
} from '@libs/shared/sto-types';
import { NotificationService } from '../services/notification.service';

@Controller('admin/sto/notification-rules')
export class NotificationRuleController {
  constructor(
    @InjectRepository(StoNotificationRule)
    private ruleRepository: Repository<StoNotificationRule>,
    private notificationService: NotificationService,
  ) {}

  @Post()
  async create(@Body() createDto: CreateNotificationRuleDto) {
    const rule = this.ruleRepository.create(createDto);
    return this.ruleRepository.save(rule);
  }

  @Get()
  findAll() {
    return this.ruleRepository.find({ relations: ['template'] });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ruleRepository.findOne({
      where: { id },
      relations: ['template'],
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: Partial<CreateNotificationRuleDto>) {
    await this.ruleRepository.update(id, updateDto);
    return this.ruleRepository.findOne({
      where: { id },
      relations: ['template'],
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.ruleRepository.delete(id);
    return { message: 'Notification rule deleted successfully' };
  }

  @Post(':id/test')
  async sendTest(
    @Param('id') id: string,
    @Body() body: { phone?: string; email?: string },
  ) {
    await this.notificationService.sendTestNotification(id, body);
    return { message: 'Test notification sent successfully' };
  }
}
