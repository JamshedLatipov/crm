import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadSource } from '../lead.entity';
import { LeadActivity, ActivityType } from '../entities/lead-activity.entity';
import { LeadScoringService } from './lead-scoring.service';
import { Company } from '../../companies/entities/company.entity';
import { AssignmentService } from '../../shared/services/assignment.service';

export interface WebhookData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  source: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  form_name?: string;
  page_url?: string;
  ip_address?: string;
  user_agent?: string;
  custom_fields?: Record<string, string | number | boolean>;
}

export interface GoogleAnalyticsData {
  clientId: string;
  sessionId: string;
  source: string;
  medium: string;
  campaign?: string;
  pageViews: number;
  timeOnSite: number;
  bounceRate: number;
  location?: {
    country: string;
    city: string;
  };
}

@Injectable()
export class LeadCaptureService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(LeadActivity)
    private readonly activityRepo: Repository<LeadActivity>,
    private readonly scoringService: LeadScoringService,
    private readonly assignmentService: AssignmentService
  ) {}

  async captureFromWebsite(data: WebhookData, ipAddress?: string, userAgent?: string): Promise<Lead> {
    // Проверяем, есть ли уже лид с таким email или телефоном
    let existingLead: Lead | null = null;
    
    if (data.email) {
      existingLead = await this.leadRepo.findOne({
        where: { email: data.email }
      });
    }
    
    if (!existingLead && data.phone) {
      existingLead = await this.leadRepo.findOne({
        where: { phone: data.phone }
      });
    }

    if (existingLead) {
      // Обновляем существующий лид
      const updatedData: Partial<Lead> = {
        company: { id: data.company || existingLead.company.id } as Company,
        position: data.position || existingLead.position,
        utmSource: data.utm_source || existingLead.utmSource,
        utmMedium: data.utm_medium || existingLead.utmMedium,
        utmCampaign: data.utm_campaign || existingLead.utmCampaign,
        utmContent: data.utm_content || existingLead.utmContent,
        utmTerm: data.utm_term || existingLead.utmTerm,
        sourceDetails: data.form_name || existingLead.sourceDetails,
        customFields: {
          ...existingLead.customFields,
          ...data.custom_fields
        }
      };

      await this.leadRepo.update(existingLead.id, updatedData);
      
      // Записываем активность
      await this.activityRepo.save({
        leadId: existingLead.id,
        type: ActivityType.FORM_SUBMITTED,
        title: 'Повторная отправка формы',
        description: `Форма "${data.form_name || 'неизвестная'}" отправлена повторно`,
        ipAddress,
        userAgent,
        source: data.source,
        metadata: {
          formName: data.form_name || '',
          pageUrl: data.page_url || '',
          isRepeat: true
        }
      });

      // Пересчитываем скор
      await this.scoringService.calculateScore(existingLead.id, {
        lead: existingLead,
        activity: {
          type: ActivityType.FORM_SUBMITTED,
          metadata: { formName: data.form_name }
        },
        utm: {
          source: data.utm_source,
          medium: data.utm_medium,
          campaign: data.utm_campaign
        }
      });

      return this.leadRepo.findOneBy({ id: existingLead.id }) || existingLead;
    }

    // Создаем новый лид
    const newLead = await this.leadRepo.save({
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: { id: data.company },
      position: data.position,
      source: this.mapSource(data.source),
      sourceDetails: data.form_name,
      utmSource: data.utm_source,
      utmMedium: data.utm_medium,
      utmCampaign: data.utm_campaign,
      utmContent: data.utm_content,
      utmTerm: data.utm_term,
      customFields: data.custom_fields
    });

    // Записываем активность создания
    await this.activityRepo.save({
      leadId: newLead.id,
      type: ActivityType.FORM_SUBMITTED,
      title: 'Форма отправлена',
      description: `Новый лид создан через форму "${data.form_name || 'неизвестная'}"`,
      ipAddress,
      userAgent,
      source: data.source,
      metadata: {
        formName: data.form_name || '',
        pageUrl: data.page_url || '',
        isNew: true
      }
    });

    // Начальная оценка лида
    await this.scoringService.calculateScore(newLead.id, {
      lead: newLead,
      activity: {
        type: ActivityType.FORM_SUBMITTED,
        metadata: { formName: data.form_name }
      },
      utm: {
        source: data.utm_source,
        medium: data.utm_medium,
        campaign: data.utm_campaign
      }
    });

    return newLead;
  }

  async captureFromSocialMedia(
    platform: string, 
    userData: {
      name: string;
      profile_url?: string;
      avatar_url?: string;
      followers_count?: number;
      bio?: string;
    },
    campaignData?: {
      campaign_id: string;
      campaign_name: string;
      ad_id?: string;
      ad_name?: string;
    }
  ): Promise<Lead> {
    const lead = await this.leadRepo.save({
      name: userData.name,
      source: LeadSource.FACEBOOK, // Updated from SOCIAL_MEDIA
      sourceDetails: platform,
      campaign: campaignData?.campaign_name,
      customFields: {
        socialPlatform: platform,
        profileUrl: userData.profile_url || '',
        avatarUrl: userData.avatar_url || '',
        followersCount: userData.followers_count || 0,
        bio: userData.bio || '',
        campaignId: campaignData?.campaign_id || '',
        adId: campaignData?.ad_id || '',
        adName: campaignData?.ad_name || ''
      }
    });

    await this.activityRepo.save({
      leadId: lead.id,
      type: ActivityType.FORM_SUBMITTED,
      title: 'Лид из социальных сетей',
      description: `Новый лид создан из ${platform}`,
      source: platform,
      metadata: {
        platform,
        campaignId: campaignData?.campaign_id || '',
        campaignName: campaignData?.campaign_name || ''
      }
    });

    // Оценка лида из социальных сетей
    await this.scoringService.calculateScore(lead.id, {
      lead,
      activity: {
        type: ActivityType.FORM_SUBMITTED,
        metadata: { platform }
      }
    });

    return lead;
  }

  async enrichFromGoogleAnalytics(leadId: number, gaData: GoogleAnalyticsData): Promise<void> {
    const lead = await this.leadRepo.findOneBy({ id: leadId });
    if (!lead) return;

    // Обновляем лид данными из GA
    await this.leadRepo.update(leadId, {
      customFields: {
        ...lead.customFields,
        gaClientId: gaData.clientId,
        gaSessionId: gaData.sessionId,
        pageViews: gaData.pageViews,
        timeOnSite: gaData.timeOnSite,
        bounceRate: gaData.bounceRate,
        locationCountry: gaData.location?.country || '',
        locationCity: gaData.location?.city || ''
      }
    });

    // Записываем активность
    await this.activityRepo.save({
      leadId,
      type: ActivityType.WEBSITE_VISIT,
      title: 'Данные из Google Analytics',
      description: `Обогащен данными: ${gaData.pageViews} просмотров, ${Math.round(gaData.timeOnSite / 60)} мин на сайте`,
      metadata: {
        pageViews: gaData.pageViews,
        timeOnSite: gaData.timeOnSite,
        bounceRate: gaData.bounceRate,
        source: gaData.source,
        medium: gaData.medium
      }
    });

    // Начисляем баллы за активность на сайте
    if (gaData.pageViews > 5) {
      await this.scoringService.calculateScore(leadId, {
        lead,
        activity: {
          type: ActivityType.WEBSITE_VISIT,
          metadata: { pageViews: gaData.pageViews }
        }
      });
    }
  }

  async captureFromEmail(
    emailData: {
      email: string;
      name?: string;
      campaign_id?: string;
      email_type: 'opened' | 'clicked' | 'replied' | 'unsubscribed';
      link_url?: string;
      timestamp: Date;
    }
  ): Promise<void> {
    const lead = await this.leadRepo.findOne({
      where: { email: emailData.email }
    });

    if (!lead) return;

    const activityType = this.mapEmailActivityType(emailData.email_type);
    const scorePoints = this.getEmailActivityPoints(emailData.email_type);

    await this.activityRepo.save({
      leadId: lead.id,
      type: activityType,
      title: `Email ${emailData.email_type}`,
      description: emailData.link_url 
        ? `Клик по ссылке: ${emailData.link_url}`
        : `Email ${emailData.email_type}`,
      scorePoints,
      metadata: {
        campaignId: emailData.campaign_id || '',
        linkUrl: emailData.link_url || '',
        emailType: emailData.email_type
      }
    });

    // Обновляем статус подписки
    if (emailData.email_type === 'unsubscribed') {
      await this.leadRepo.update(lead.id, { isUnsubscribed: true });
    }

    // Пересчитываем скор
    await this.scoringService.calculateScore(lead.id, {
      lead,
      activity: {
        type: activityType,
        metadata: { emailType: emailData.email_type }
      }
    });
  }

  async captureFromColdCall(
    callData: {
      phone: string;
      name?: string;
      duration: number; // в секундах
      outcome: 'answered' | 'voicemail' | 'busy' | 'no_answer';
      notes?: string;
      manager_id: string;
    }
  ): Promise<Lead> {
    let lead = await this.leadRepo.findOne({
      where: { phone: callData.phone }
    });

    if (!lead) {
      // Создаем новый лид
      lead = await this.leadRepo.save({
        name: callData.name || 'Unknown',
        phone: callData.phone,
        source: LeadSource.COLD_OUTREACH, // Updated from COLD_CALL
        notes: callData.notes
      });

      // Создаем назначение через AssignmentService
      await this.assignmentService.createAssignment({
        entityType: 'lead',
        entityId: lead.id.toString(),
        assignedTo: [Number(callData.manager_id)],
        assignedBy: Number(callData.manager_id), // менеджер сам себе назначает
        reason: 'Assigned during cold call capture',
        notifyAssignees: false
      });
    } else {
      // Обновляем существующий лид
      await this.leadRepo.update(lead.id, {
        name: callData.name || lead.name,
        notes: callData.notes ? `${lead.notes || ''}\n${callData.notes}` : lead.notes,
        lastContactDate: new Date(),
        contactAttempts: lead.contactAttempts + 1
      });

      // Создаем или обновляем назначение
      const currentAssignments = await this.assignmentService.getCurrentAssignments('lead', lead.id.toString());
      if (currentAssignments.length === 0 || currentAssignments[0].userId !== Number(callData.manager_id)) {
        // Снимаем старые назначения
        if (currentAssignments.length > 0) {
          await this.assignmentService.removeAssignment({
            entityType: 'lead',
            entityId: lead.id.toString(),
            userIds: currentAssignments.map(a => a.userId),
            reason: 'Reassigned during cold call'
          });
        }

        // Создаем новое назначение
        await this.assignmentService.createAssignment({
          entityType: 'lead',
          entityId: lead.id.toString(),
          assignedTo: [Number(callData.manager_id)],
          assignedBy: Number(callData.manager_id),
          reason: 'Assigned during cold call update',
          notifyAssignees: false
        });
      }
    }

    const activityType = callData.outcome === 'answered' 
      ? ActivityType.PHONE_CALL_RECEIVED 
      : ActivityType.PHONE_CALL_MADE;

    await this.activityRepo.save({
      leadId: lead.id,
      type: activityType,
      title: `Холодный звонок - ${callData.outcome}`,
      description: `Звонок длительностью ${callData.duration}с. Результат: ${callData.outcome}`,
      userId: callData.manager_id,
      metadata: {
        duration: callData.duration,
        outcome: callData.outcome,
        notes: callData.notes || ''
      }
    });

    // Начисляем баллы за принятый звонок
    if (callData.outcome === 'answered' && callData.duration > 30) {
      await this.scoringService.calculateScore(lead.id, {
        lead,
        activity: {
          type: activityType,
          metadata: { outcome: callData.outcome, duration: callData.duration }
        }
      });
    }

    return lead;
  }

  private mapSource(source: string): LeadSource {
    const sourceMap: Record<string, LeadSource> = {
      'website': LeadSource.WEBSITE,
      'facebook': LeadSource.FACEBOOK,
      'google': LeadSource.GOOGLE_ADS,
      'instagram': LeadSource.FACEBOOK, // Use FACEBOOK for Instagram
      'linkedin': LeadSource.LINKEDIN,
      'email': LeadSource.EMAIL,
      'referral': LeadSource.REFERRAL,
      'webinar': LeadSource.WEBINAR,
      'trade_show': LeadSource.TRADE_SHOW,
      'organic': LeadSource.CONTENT_MARKETING, // Map organic to content marketing
      'direct': LeadSource.OTHER, // Map direct to other
      'phone': LeadSource.PHONE,
      'cold_call': LeadSource.COLD_OUTREACH,
      'partner': LeadSource.PARTNER
    };

    return sourceMap[source.toLowerCase()] || LeadSource.OTHER;
  }

  private mapEmailActivityType(emailType: string): ActivityType {
    switch (emailType) {
      case 'opened': return ActivityType.EMAIL_OPENED;
      case 'clicked': return ActivityType.EMAIL_CLICKED;
      case 'replied': return ActivityType.EMAIL_SENT; // Ответ на email
      default: return ActivityType.EMAIL_SENT;
    }
  }

  private getEmailActivityPoints(emailType: string): number {
    switch (emailType) {
      case 'opened': return 5;
      case 'clicked': return 10;
      case 'replied': return 25;
      case 'unsubscribed': return -10;
      default: return 0;
    }
  }

  async getLeadSourceAnalytics(days = 30): Promise<{
    sources: Array<{
      source: string;
      count: number;
      conversionRate: number;
      averageScore: number;
    }>;
    totalLeads: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const leads = await this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.createdAt >= :startDate', { startDate })
      .getMany();

    const sourceStats = leads.reduce((acc, lead) => {
      const source = lead.source || 'unknown';
      
      if (!acc[source]) {
        acc[source] = {
          count: 0,
          converted: 0,
          totalScore: 0
        };
      }
      
      acc[source].count++;
      acc[source].totalScore += lead.score;
      
      if (lead.status === 'converted') {
        acc[source].converted++;
      }
      
      return acc;
    }, {} as Record<string, { count: number; converted: number; totalScore: number }>);

    const sources = Object.entries(sourceStats).map(([source, stats]) => ({
      source,
      count: stats.count,
      conversionRate: stats.count > 0 ? (stats.converted / stats.count) * 100 : 0,
      averageScore: stats.count > 0 ? stats.totalScore / stats.count : 0
    }));

    return {
      sources: sources.sort((a, b) => b.count - a.count),
      totalLeads: leads.length
    };
  }
}
