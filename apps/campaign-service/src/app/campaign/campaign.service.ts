import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Campaign, CampaignStatus, CampaignType, AudienceType } from './entities/campaign.entity';
import { SERVICES, NOTIFICATION_PATTERNS, CONTACT_PATTERNS, LEAD_PATTERNS } from '@crm/contracts';
import { firstValueFrom } from 'rxjs';

export interface CreateCampaignDto {
  name: string;
  description?: string;
  type: CampaignType;
  audienceType: AudienceType;
  audienceFilters?: Record<string, unknown>;
  templateId?: number;
  scheduledAt?: string;
  settings?: Record<string, unknown>;
  createdBy?: number;
}

export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  type?: CampaignType;
  audienceType?: AudienceType;
  audienceFilters?: Record<string, unknown>;
  templateId?: number;
  scheduledAt?: string;
  settings?: Record<string, unknown>;
}

export interface CampaignFilterDto {
  status?: CampaignStatus;
  type?: CampaignType;
  page?: number;
  limit?: number;
}

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @Inject(SERVICES.NOTIFICATION)
    private readonly notificationClient: ClientProxy,
    @Inject(SERVICES.CONTACT)
    private readonly contactClient: ClientProxy,
    @Inject(SERVICES.LEAD)
    private readonly leadClient: ClientProxy,
  ) {}

  async findAll(filter: CampaignFilterDto) {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.campaignRepository.createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.template', 'template');

    if (filter.status) {
      query.andWhere('campaign.status = :status', { status: filter.status });
    }

    if (filter.type) {
      query.andWhere('campaign.type = :type', { type: filter.type });
    }

    query.orderBy('campaign.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(id: number) {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['template'],
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }
    return campaign;
  }

  async create(dto: CreateCampaignDto) {
    const campaign = this.campaignRepository.create({
      name: dto.name,
      description: dto.description,
      type: dto.type,
      audienceType: dto.audienceType,
      audienceFilters: dto.audienceFilters,
      templateId: dto.templateId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      settings: dto.settings,
      createdBy: dto.createdBy,
      status: CampaignStatus.DRAFT,
    });

    return this.campaignRepository.save(campaign);
  }

  async update(id: number, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new Error('Can only update campaigns in draft status');
    }

    Object.assign(campaign, {
      ...dto,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : campaign.scheduledAt,
    });

    return this.campaignRepository.save(campaign);
  }

  async delete(id: number) {
    const campaign = await this.findOne(id);
    if (campaign.status === CampaignStatus.RUNNING) {
      throw new Error('Cannot delete a running campaign');
    }
    await this.campaignRepository.remove(campaign);
  }

  async schedule(id: number, scheduledAt: Date) {
    const campaign = await this.findOne(id);
    campaign.scheduledAt = scheduledAt;
    campaign.status = CampaignStatus.SCHEDULED;
    return this.campaignRepository.save(campaign);
  }

  async start(id: number) {
    const campaign = await this.findOne(id);
    
    if (!campaign.templateId) {
      throw new Error('Campaign must have a template');
    }

    // Get recipients based on audience type
    const recipients = await this.getRecipients(campaign);
    
    campaign.status = CampaignStatus.RUNNING;
    campaign.startedAt = new Date();
    campaign.totalRecipients = recipients.length;
    await this.campaignRepository.save(campaign);

    // Send to recipients in batches
    this.processCampaign(campaign, recipients);

    return campaign;
  }

  async pause(id: number) {
    const campaign = await this.findOne(id);
    if (campaign.status !== CampaignStatus.RUNNING) {
      throw new Error('Can only pause running campaigns');
    }
    campaign.status = CampaignStatus.PAUSED;
    return this.campaignRepository.save(campaign);
  }

  async resume(id: number) {
    const campaign = await this.findOne(id);
    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new Error('Can only resume paused campaigns');
    }
    campaign.status = CampaignStatus.RUNNING;
    return this.campaignRepository.save(campaign);
  }

  async cancel(id: number) {
    const campaign = await this.findOne(id);
    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new Error('Cannot cancel completed campaign');
    }
    campaign.status = CampaignStatus.CANCELLED;
    return this.campaignRepository.save(campaign);
  }

  async getStats(id: number) {
    const campaign = await this.findOne(id);
    return {
      totalRecipients: campaign.totalRecipients,
      sent: campaign.sent,
      delivered: campaign.delivered,
      opened: campaign.opened,
      clicked: campaign.clicked,
      bounced: campaign.bounced,
      unsubscribed: campaign.unsubscribed,
      deliveryRate: campaign.sent > 0 ? (campaign.delivered / campaign.sent) * 100 : 0,
      openRate: campaign.delivered > 0 ? (campaign.opened / campaign.delivered) * 100 : 0,
      clickRate: campaign.opened > 0 ? (campaign.clicked / campaign.opened) * 100 : 0,
    };
  }

  private async getRecipients(campaign: Campaign): Promise<{ id: string; email?: string; phone?: string }[]> {
    try {
      switch (campaign.audienceType) {
        case AudienceType.ALL_CONTACTS:
          const contacts = await firstValueFrom(
            this.contactClient.send(CONTACT_PATTERNS.GET_CONTACTS, { limit: 10000 })
          );
          return (contacts.items || []).map((c: { id: string; email?: string; phone?: string }) => ({
            id: c.id,
            email: c.email,
            phone: c.phone,
          }));

        case AudienceType.ALL_LEADS:
          const leads = await firstValueFrom(
            this.leadClient.send(LEAD_PATTERNS.GET_LEADS, { limit: 10000 })
          );
          return (leads.items || []).map((l: { id: string; email?: string; phone?: string }) => ({
            id: l.id,
            email: l.email,
            phone: l.phone,
          }));

        case AudienceType.SEGMENT:
        case AudienceType.CUSTOM:
          // TODO: Implement segment filtering
          return [];

        default:
          return [];
      }
    } catch (error) {
      this.logger.error(`Failed to get recipients: ${(error as Error).message}`);
      return [];
    }
  }

  private async processCampaign(campaign: Campaign, recipients: { id: string; email?: string; phone?: string }[]) {
    const batchSize = 100;
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      // Check if campaign is still running
      const current = await this.campaignRepository.findOne({ where: { id: campaign.id } });
      if (current?.status !== CampaignStatus.RUNNING) {
        this.logger.log(`Campaign ${campaign.id} stopped`);
        break;
      }

      for (const recipient of batch) {
        try {
          if (campaign.type === CampaignType.EMAIL && recipient.email) {
            this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND, {
              type: 'campaign',
              channel: 'email',
              recipientId: recipient.id,
              recipientEmail: recipient.email,
              title: `Campaign: ${campaign.name}`,
              message: campaign.template?.body || '',
              data: { campaignId: campaign.id },
            });
          } else if (campaign.type === CampaignType.SMS && recipient.phone) {
            this.notificationClient.emit(NOTIFICATION_PATTERNS.SEND, {
              type: 'campaign',
              channel: 'sms',
              recipientId: recipient.id,
              recipientPhone: recipient.phone,
              title: campaign.name,
              message: campaign.template?.body || '',
              data: { campaignId: campaign.id },
            });
          }
          
          campaign.sent++;
        } catch (error) {
          this.logger.error(`Failed to send to ${recipient.id}: ${(error as Error).message}`);
          campaign.bounced++;
        }
      }

      await this.campaignRepository.save(campaign);
      
      // Add delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark as completed
    campaign.status = CampaignStatus.COMPLETED;
    campaign.completedAt = new Date();
    await this.campaignRepository.save(campaign);
    
    this.logger.log(`Campaign ${campaign.id} completed`);
  }
}
