import { Controller, Post, Body, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBody, ApiProperty } from '@nestjs/swagger';
import { Request } from 'express';
import { LeadCaptureService, WebhookData, GoogleAnalyticsData } from '../services/lead-capture.service';
import { Lead } from '../lead.entity';

export class WebsiteFormDto {
  @ApiProperty({ example: 'Иван Иванов', description: 'Full name from the form' })
  name: string;

  @ApiProperty({ example: 'ivan@example.com', required: false })
  email?: string;

  @ApiProperty({ example: '+71234567890', required: false })
  phone?: string;

  @ApiProperty({ example: 'Acme Inc.', required: false })
  company?: string;

  @ApiProperty({ example: 'CTO', required: false })
  position?: string;

  @ApiProperty({ example: 'website', description: 'Source identifier (website, facebook, zapier, etc.)' })
  source: string;

  @ApiProperty({ example: 'google', required: false })
  utm_source?: string;

  @ApiProperty({ example: 'cpc', required: false })
  utm_medium?: string;

  @ApiProperty({ example: 'spring_sale', required: false })
  utm_campaign?: string;

  @ApiProperty({ example: 'cta-button', required: false })
  utm_content?: string;

  @ApiProperty({ example: 'discount', required: false })
  utm_term?: string;

  @ApiProperty({ example: 'Contact us form', required: false })
  form_name?: string;

  @ApiProperty({ example: 'https://example.com/pricing', required: false })
  page_url?: string;

  @ApiProperty({ example: { product: 'pro', interested: true }, required: false, description: 'Arbitrary key/value pairs' })
  custom_fields?: Record<string, string | number | boolean>;
}

export class SocialMediaLeadDto {
  @ApiProperty({ example: 'facebook', description: 'Platform name (facebook, instagram, google-ads, etc.)' })
  platform: string;

  @ApiProperty({
    example: {
      name: 'Мария Петрова',
      profile_url: 'https://facebook.com/maria',
      avatar_url: 'https://cdn.example.com/avatar.jpg',
      followers_count: 1200,
      bio: 'Marketing specialist'
    },
    description: 'User/profile data from the social platform'
  })
  user_data: {
    name: string;
    profile_url?: string;
    avatar_url?: string;
    followers_count?: number;
    bio?: string;
  };

  @ApiProperty({
    example: { campaign_id: 'cmp_123', campaign_name: 'Fall Campaign', ad_id: 'ad_1', ad_name: 'Ad variant A' },
    required: false,
    description: 'Optional campaign/ad info'
  })
  campaign_data?: {
    campaign_id: string;
    campaign_name: string;
    ad_id?: string;
    ad_name?: string;
  };
}

export class EmailActivityDto {
  @ApiProperty({ example: 'client@example.com' })
  email: string;

  @ApiProperty({ example: 'Клиент', required: false })
  name?: string;

  @ApiProperty({ example: 'campaign_2025', required: false })
  campaign_id?: string;

  @ApiProperty({ example: 'opened', description: "One of: 'opened', 'clicked', 'replied', 'unsubscribed'" })
  email_type: 'opened' | 'clicked' | 'replied' | 'unsubscribed';

  @ApiProperty({ example: 'https://example.com/product', required: false })
  link_url?: string;

  @ApiProperty({ example: '2025-10-11T12:34:56Z' })
  timestamp: Date;
}

export class ColdCallDto {
  @ApiProperty({ example: '+71234567890' })
  phone: string;

  @ApiProperty({ example: 'Андрей', required: false })
  name?: string;

  @ApiProperty({ example: 125, description: 'Call duration in seconds' })
  duration: number;

  @ApiProperty({ example: 'answered', description: "One of: 'answered', 'voicemail', 'busy', 'no_answer'" })
  outcome: 'answered' | 'voicemail' | 'busy' | 'no_answer';

  @ApiProperty({ example: 'Left voicemail and follow-up scheduled', required: false })
  notes?: string;

  @ApiProperty({ example: '42', description: 'Manager user id who performed the call' })
  manager_id: string;
}

export class GoogleAnalyticsDto {
  @ApiProperty({ example: 123 })
  lead_id: number;

  @ApiProperty({ example: { pagePath: '/pricing', source: 'google', medium: 'organic' }, description: 'Partial example of GA payload' })
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
  @ApiBody({
    type: WebsiteFormDto,
    schema: {
      example: {
        name: 'Иван Иванов',
        email: 'ivan@example.com',
        phone: '+71234567890',
        company: 'Acme Inc.',
        position: 'CTO',
        source: 'website',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'spring_sale',
        form_name: 'Contact us',
        page_url: 'https://example.com/contact',
        custom_fields: { product: 'pro', interested: true }
      }
    }
  })
  async captureFromWebsite(
    @Body() data: WebsiteFormDto,
    @Req() req: Request
  ): Promise<Lead> {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.captureService.captureFromWebsite(data as WebhookData, ipAddress, userAgent);
  }

  @Post('social-media')
  @ApiBody({
    type: SocialMediaLeadDto,
    schema: {
      example: {
        platform: 'facebook',
        user_data: {
          name: 'Мария Петрова',
          profile_url: 'https://facebook.com/maria',
          avatar_url: 'https://cdn.example.com/avatar.jpg',
          followers_count: 1200,
          bio: 'Marketing specialist'
        },
        campaign_data: {
          campaign_id: 'cmp_123',
          campaign_name: 'Fall Campaign',
          ad_id: 'ad_1',
          ad_name: 'Ad variant A'
        }
      }
    }
  })
  async captureFromSocialMedia(@Body() data: SocialMediaLeadDto): Promise<Lead> {
    return this.captureService.captureFromSocialMedia(
      data.platform,
      data.user_data,
      data.campaign_data
    );
  }

  @Post('email-activity')
  @ApiBody({
    type: EmailActivityDto,
    schema: {
      example: {
        email: 'client@example.com',
        name: 'Клиент',
        campaign_id: 'campaign_2025',
        email_type: 'opened',
        link_url: 'https://example.com/product',
        timestamp: '2025-10-11T12:34:56Z'
      }
    }
  })
  async captureEmailActivity(@Body() data: EmailActivityDto): Promise<{ success: boolean }> {
    await this.captureService.captureFromEmail(data);
    return { success: true };
  }

  @Post('cold-call')
  @ApiBody({
    type: ColdCallDto,
    schema: {
      example: {
        phone: '+71234567890',
        name: 'Андрей',
        duration: 95,
        outcome: 'answered',
        notes: 'Discussed pricing and next steps',
        manager_id: '42'
      }
    }
  })
  async captureFromColdCall(@Body() data: ColdCallDto): Promise<Lead> {
    return this.captureService.captureFromColdCall(data);
  }

  @Post('google-analytics')
  @ApiBody({
    type: GoogleAnalyticsDto,
    schema: {
      example: {
        lead_id: 123,
        ga_data: { pagePath: '/pricing', source: 'google', medium: 'organic' }
      }
    }
  })
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
  @ApiBody({
    schema: {
      example: {
        name: 'Андрей К.',
        email: 'andrey@example.com',
        phone: '+79876543210',
        company: 'Startup LTD',
        position: 'Founder',
        utm_source: 'email',
        utm_medium: 'newsletter',
        form_name: 'Zapier form',
        page_url: 'https://example.com/landing',
        custom_fields: { leadSource: 'newsletter_oct' }
      }
    }
  })
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
