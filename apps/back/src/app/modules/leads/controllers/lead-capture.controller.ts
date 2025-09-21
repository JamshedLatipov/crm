import { Controller, Post, Body, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { LeadCaptureService, WebhookData, GoogleAnalyticsData } from '../services/lead-capture.service';
import { Lead } from '../lead.entity';

export class WebsiteFormDto {
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
  custom_fields?: Record<string, string | number | boolean>;
}

export class SocialMediaLeadDto {
  platform: string;
  user_data: {
    name: string;
    profile_url?: string;
    avatar_url?: string;
    followers_count?: number;
    bio?: string;
  };
  campaign_data?: {
    campaign_id: string;
    campaign_name: string;
    ad_id?: string;
    ad_name?: string;
  };
}

export class EmailActivityDto {
  email: string;
  name?: string;
  campaign_id?: string;
  email_type: 'opened' | 'clicked' | 'replied' | 'unsubscribed';
  link_url?: string;
  timestamp: Date;
}

export class ColdCallDto {
  phone: string;
  name?: string;
  duration: number;
  outcome: 'answered' | 'voicemail' | 'busy' | 'no_answer';
  notes?: string;
  manager_id: string;
}

export class GoogleAnalyticsDto {
  lead_id: number;
  ga_data: GoogleAnalyticsData;
}

interface FacebookWebhookData {
  name?: string;
  profile_url?: string;
  campaign_id?: string;
  campaign_name?: string;
  ad_id?: string;
  ad_name?: string;
}

interface HubSpotProperty {
  value: string;
}

interface HubSpotContact {
  vid: string;
  portalId: string;
  properties: {
    firstname?: HubSpotProperty;
    lastname?: HubSpotProperty;
    email?: HubSpotProperty;
    phone?: HubSpotProperty;
    company?: HubSpotProperty;
    jobtitle?: HubSpotProperty;
    lifecyclestage?: HubSpotProperty;
  };
}

interface MailChimpMerges {
  FNAME?: string;
  LNAME?: string;
}

interface MailChimpData {
  email: string;
  list_id: string;
  merges: MailChimpMerges;
}

@ApiTags('lead-capture')
@Controller('lead-capture')
export class LeadCaptureController {
  constructor(private readonly captureService: LeadCaptureService) {}

  @Post('website')
  @ApiBody({ type: WebsiteFormDto })
  async captureFromWebsite(
    @Body() data: WebsiteFormDto,
    @Req() req: Request
  ): Promise<Lead> {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.captureService.captureFromWebsite(data as WebhookData, ipAddress, userAgent);
  }

  @Post('social-media')
  @ApiBody({ type: SocialMediaLeadDto })
  async captureFromSocialMedia(@Body() data: SocialMediaLeadDto): Promise<Lead> {
    return this.captureService.captureFromSocialMedia(
      data.platform,
      data.user_data,
      data.campaign_data
    );
  }

  @Post('email-activity')
  @ApiBody({ type: EmailActivityDto })
  async captureEmailActivity(@Body() data: EmailActivityDto): Promise<{ success: boolean }> {
    await this.captureService.captureFromEmail(data);
    return { success: true };
  }

  @Post('cold-call')
  @ApiBody({ type: ColdCallDto })
  async captureFromColdCall(@Body() data: ColdCallDto): Promise<Lead> {
    return this.captureService.captureFromColdCall(data);
  }

  @Post('google-analytics')
  @ApiBody({ type: GoogleAnalyticsDto })
  async enrichFromGoogleAnalytics(@Body() data: GoogleAnalyticsDto): Promise<{ success: boolean }> {
    await this.captureService.enrichFromGoogleAnalytics(data.lead_id, data.ga_data);
    return { success: true };
  }

  @Get('source-analytics')
  async getSourceAnalytics(@Query('days') days = 30) {
    return this.captureService.getLeadSourceAnalytics(Number(days));
  }

  // Webhook endpoints для различных платформ
  @Post('webhooks/zapier')
  async zapierWebhook(@Body() data: Record<string, unknown>, @Req() req: Request): Promise<Lead> {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const webhookData: WebhookData = {
      name: (data.name || data.full_name || 'Unknown') as string,
      email: data.email as string,
      phone: data.phone as string,
      company: data.company as string,
      position: (data.position || data.job_title) as string,
      source: 'zapier',
      utm_source: data.utm_source as string,
      utm_medium: data.utm_medium as string,
      utm_campaign: data.utm_campaign as string,
      utm_content: data.utm_content as string,
      utm_term: data.utm_term as string,
      form_name: (data.form_name || 'Zapier Integration') as string,
      page_url: data.page_url as string,
      custom_fields: data.custom_fields as Record<string, string | number | boolean>
    };

    return this.captureService.captureFromWebsite(webhookData, ipAddress, userAgent);
  }

  @Post('webhooks/facebook')
  async facebookWebhook(@Body() data: Record<string, unknown>): Promise<Lead> {
    const leadData = data as FacebookWebhookData;

    return this.captureService.captureFromSocialMedia(
      'facebook',
      {
        name: leadData.name || 'Facebook Lead',
        profile_url: leadData.profile_url
      },
      {
        campaign_id: leadData.campaign_id || '',
        campaign_name: leadData.campaign_name || 'Facebook Campaign',
        ad_id: leadData.ad_id,
        ad_name: leadData.ad_name
      }
    );
  }

  @Post('webhooks/google-ads')
  async googleAdsWebhook(@Body() data: Record<string, unknown>): Promise<Lead> {
    return this.captureService.captureFromSocialMedia(
      'google-ads',
      {
        name: (data.name || 'Google Ads Lead') as string
      },
      {
        campaign_id: (data.campaign_id || '') as string,
        campaign_name: (data.campaign_name || 'Google Ads Campaign') as string,
        ad_id: data.ad_id as string,
        ad_name: data.ad_name as string
      }
    );
  }

  @Post('webhooks/hubspot')
  async hubspotWebhook(@Body() data: HubSpotContact[], @Req() req: Request): Promise<Lead> {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const contact = data[0]; // HubSpot sends array of contacts
    
    const webhookData: WebhookData = {
      name: `${contact.properties.firstname?.value || ''} ${contact.properties.lastname?.value || ''}`.trim() || 'Unknown',
      email: contact.properties.email?.value,
      phone: contact.properties.phone?.value,
      company: contact.properties.company?.value,
      position: contact.properties.jobtitle?.value,
      source: 'hubspot',
      form_name: 'HubSpot Integration',
      custom_fields: {
        hubspotId: contact.vid,
        hubspotPortalId: contact.portalId,
        lifecycleStage: contact.properties.lifecyclestage?.value || ''
      }
    };

    return this.captureService.captureFromWebsite(webhookData, ipAddress, userAgent);
  }

  @Post('webhooks/mailchimp')
  async mailchimpWebhook(@Body() data: { type: string; data: MailChimpData }): Promise<{ success: boolean }> {
    if (data.type === 'subscribe') {
      const webhookData: WebhookData = {
        name: `${data.data.merges.FNAME || ''} ${data.data.merges.LNAME || ''}`.trim() || 'Unknown',
        email: data.data.email,
        source: 'mailchimp',
        form_name: 'MailChimp Subscription',
        custom_fields: {
          mailchimpListId: data.data.list_id,
          mailchimpFirstName: data.data.merges.FNAME || '',
          mailchimpLastName: data.data.merges.LNAME || ''
        }
      };

      await this.captureService.captureFromWebsite(webhookData);
    }

    return { success: true };
  }
}
