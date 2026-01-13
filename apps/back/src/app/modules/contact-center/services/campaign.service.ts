import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { OutboundCampaign, CampaignStatus } from '../entities/outbound-campaign.entity';
import { OutboundCampaignContact } from '../entities/outbound-campaign-contact.entity';
import { OutboundCampaignCall } from '../entities/outbound-campaign-call.entity';
import { OutboundCampaignSchedule } from '../entities/outbound-campaign-schedule.entity';
import { CreateCampaignDto } from '../dto/campaign/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/campaign/update-campaign.dto';
import { CampaignFiltersDto } from '../dto/campaign/campaign-filters.dto';
import { UploadContactsDto } from '../dto/campaign/upload-contacts.dto';

@Injectable()
export class CampaignService {
  constructor(
    @InjectRepository(OutboundCampaign)
    private readonly campaignRepository: Repository<OutboundCampaign>,
    @InjectRepository(OutboundCampaignContact)
    private readonly contactRepository: Repository<OutboundCampaignContact>,
    @InjectRepository(OutboundCampaignCall)
    private readonly callRepository: Repository<OutboundCampaignCall>,
    @InjectRepository(OutboundCampaignSchedule)
    private readonly scheduleRepository: Repository<OutboundCampaignSchedule>,
  ) {}

  async create(createDto: CreateCampaignDto, userId: number): Promise<OutboundCampaign> {
    // Use insert to ensure all fields are properly set
    const result = await this.campaignRepository.insert({
      name: createDto.name,
      description: createDto.description,
      type: createDto.type,
      audioFileId: createDto.audioFileId,
      audioFilePath: createDto.audioFilePath,
      queueId: createDto.queueId,
      settings: createDto.settings,
      createdBy: userId,
      status: CampaignStatus.DRAFT,
    });

    const campaignId = result.identifiers[0].id;
    
    // Create schedules if provided
    if (createDto.schedules && createDto.schedules.length > 0) {
      const schedules = createDto.schedules.map((scheduleDto) =>
        this.scheduleRepository.create({
          ...scheduleDto,
          campaignId: campaignId,
        })
      );
      await this.scheduleRepository.save(schedules);
    }

    return this.findOne(campaignId);
  }

  async findAll(filters?: CampaignFiltersDto): Promise<OutboundCampaign[]> {
    const query = this.campaignRepository.createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.creator', 'creator')
      .leftJoinAndSelect('campaign.queue', 'queue')
      .leftJoinAndSelect('campaign.schedules', 'schedules');

    if (filters?.status) {
      query.andWhere('campaign.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      query.andWhere('campaign.type = :type', { type: filters.type });
    }

    if (filters?.queueId) {
      query.andWhere('campaign.queueId = :queueId', { queueId: filters.queueId });
    }

    if (filters?.search) {
      query.andWhere('campaign.name ILIKE :search OR campaign.description ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('campaign.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    query.orderBy('campaign.createdAt', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<OutboundCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['creator', 'queue', 'schedules'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  async update(id: string, updateDto: UpdateCampaignDto): Promise<OutboundCampaign> {
    const campaign = await this.findOne(id);

    // Don't allow updates if campaign is running
    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Cannot update a running campaign. Please pause it first.');
    }

    Object.assign(campaign, updateDto);

    // Update schedules if provided
    if (updateDto.schedules) {
      // Remove old schedules
      await this.scheduleRepository.delete({ campaignId: id });

      // Create new schedules
      const schedules = updateDto.schedules.map((scheduleDto) =>
        this.scheduleRepository.create({
          ...scheduleDto,
          campaignId: id,
        })
      );
      await this.scheduleRepository.save(schedules);
    }

    await this.campaignRepository.save(campaign);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);

    // Don't allow deletion if campaign is running
    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Cannot delete a running campaign. Please stop it first.');
    }

    await this.campaignRepository.remove(campaign);
  }

  async start(id: string): Promise<OutboundCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Campaign is already running');
    }

    campaign.status = CampaignStatus.RUNNING;
    campaign.startedAt = new Date();
    campaign.pausedAt = null;

    await this.campaignRepository.save(campaign);

    // TODO: Trigger dialer service to start calling

    return campaign;
  }

  async stop(id: string): Promise<OutboundCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.RUNNING && campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Campaign is not running or paused');
    }

    campaign.status = CampaignStatus.STOPPED;
    campaign.completedAt = new Date();

    await this.campaignRepository.save(campaign);

    // TODO: Trigger dialer service to stop calling

    return campaign;
  }

  async pause(id: string): Promise<OutboundCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.RUNNING) {
      throw new BadRequestException('Campaign is not running');
    }

    campaign.status = CampaignStatus.PAUSED;
    campaign.pausedAt = new Date();

    await this.campaignRepository.save(campaign);

    // TODO: Trigger dialer service to pause calling

    return campaign;
  }

  async resume(id: string): Promise<OutboundCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Campaign is not paused');
    }

    campaign.status = CampaignStatus.RUNNING;
    campaign.pausedAt = null;

    await this.campaignRepository.save(campaign);

    // TODO: Trigger dialer service to resume calling

    return campaign;
  }

  async uploadContacts(id: string, uploadDto: UploadContactsDto): Promise<{ added: number; skipped: number }> {
    const campaign = await this.findOne(id);

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Cannot upload contacts while campaign is running');
    }

    let added = 0;
    let skipped = 0;

    for (const contactDto of uploadDto.contacts) {
      // Check if contact already exists
      const existing = await this.contactRepository.findOne({
        where: {
          campaignId: id,
          phone: contactDto.phone,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const contact = this.contactRepository.create({
        ...contactDto,
        campaignId: id,
      });

      await this.contactRepository.save(contact);
      added++;
    }

    return { added, skipped };
  }

  /**
   * Загрузка контактов из сегмента
   */
  async loadContactsFromSegment(
    campaignId: string,
    segmentId: string,
  ): Promise<{ added: number; skipped: number }> {
    const campaign = await this.findOne(campaignId);

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException(
        'Cannot load contacts while campaign is running',
      );
    }

    // Получаем телефоны из сегмента через инжектированный сервис
    // Временно используем прямой запрос к базе
    const contacts = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.phone IS NOT NULL')
      .andWhere("contact.phone != ''")
      .getMany();

    let added = 0;
    let skipped = 0;

    for (const contact of contacts) {
      // Проверяем, нет ли уже такого контакта в кампании
      const existing = await this.contactRepository.findOne({
        where: {
          campaignId: campaignId,
          phone: contact.phone,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Разбиваем имя на firstName и lastName
      const [firstName, ...lastNameParts] = (contact.name || '').split(' ');

      const campaignContact = this.contactRepository.create({
        phone: contact.phone,
        name: contact.name || undefined,
        campaignId: campaignId,
      });

      await this.contactRepository.save(campaignContact);
      added++;
    }

    return { added, skipped };
  }

  async getContacts(id: string): Promise<OutboundCampaignContact[]> {
    return this.contactRepository.find({
      where: { campaignId: id },
      order: { createdAt: 'ASC' },
    });
  }

  async getStatistics(id: string) {
    const campaign = await this.findOne(id);

    const totalContacts = await this.contactRepository.count({
      where: { campaignId: id },
    });

    const totalCalls = await this.callRepository.count({
      where: { campaignId: id },
    });

    const answeredCalls = await this.callRepository.count({
      where: { campaignId: id, outcome: In(['answered', 'transferred']) },
    });

    const failedCalls = await this.callRepository.count({
      where: { campaignId: id, outcome: In(['failed', 'busy', 'no_answer']) },
    });

    const avgDuration = await this.callRepository
      .createQueryBuilder('call')
      .select('AVG(call.duration)', 'avg')
      .where('call.campaignId = :campaignId', { campaignId: id })
      .andWhere('call.duration > 0')
      .getRawOne();

    const contactsByStatus = await this.contactRepository
      .createQueryBuilder('contact')
      .select('contact.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('contact.campaignId = :campaignId', { campaignId: id })
      .groupBy('contact.status')
      .getRawMany();

    return {
      campaign,
      totalContacts,
      totalCalls,
      answeredCalls,
      failedCalls,
      avgDuration: Math.round(avgDuration?.avg || 0),
      contactsByStatus,
      answerRate: totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(2) : '0',
    };
  }
}
