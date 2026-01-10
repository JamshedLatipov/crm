import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadCapture, CaptureSource } from '../entities/lead-capture.entity';
import { LeadCaptureConfig } from '../entities/lead-capture-config.entity';
import { Lead } from '../entities/lead.entity';

@Injectable()
export class LeadCaptureService {
  constructor(
    @InjectRepository(LeadCapture)
    private readonly captureRepo: Repository<LeadCapture>,
    @InjectRepository(LeadCaptureConfig)
    private readonly configRepo: Repository<LeadCaptureConfig>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
  ) {}

  async captureWebsiteForm(dto: any, metadata?: { ipAddress?: string; userAgent?: string; referrer?: string }) {
    const config = await this.getConfigBySource(CaptureSource.WEBSITE_FORM);
    return this.processCaptureData(CaptureSource.WEBSITE_FORM, dto, config, metadata);
  }

  async captureSocialMedia(platform: string, dto: any) {
    const source = this.mapPlatformToSource(platform);
    const config = await this.getConfigBySource(source);
    return this.processCaptureData(source, dto, config);
  }

  async captureWebhook(source: string, dto: any, headers?: Record<string, string>) {
    const captureSource = CaptureSource.WEBHOOK;
    const config = await this.getConfigBySource(captureSource);
    return this.processCaptureData(captureSource, dto, config, { sourceId: source });
  }

  async captureZapier(dto: any) {
    const config = await this.getConfigBySource(CaptureSource.ZAPIER);
    return this.processCaptureData(CaptureSource.ZAPIER, dto, config);
  }

  async captureMailchimp(dto: any) {
    const config = await this.getConfigBySource(CaptureSource.MAILCHIMP);
    return this.processCaptureData(CaptureSource.MAILCHIMP, dto, config);
  }

  async captureFacebook(dto: any) {
    const config = await this.getConfigBySource(CaptureSource.FACEBOOK);
    const mappedData = this.mapFacebookData(dto);
    return this.processCaptureData(CaptureSource.FACEBOOK, mappedData, config, { rawData: dto });
  }

  async captureGoogleAds(dto: any) {
    const config = await this.getConfigBySource(CaptureSource.GOOGLE_ADS);
    const mappedData = this.mapGoogleAdsData(dto);
    return this.processCaptureData(CaptureSource.GOOGLE_ADS, mappedData, config, { rawData: dto });
  }

  async captureEmail(dto: any) {
    const config = await this.getConfigBySource(CaptureSource.EMAIL);
    return this.processCaptureData(CaptureSource.EMAIL, dto, config);
  }

  async captureColdCall(dto: any) {
    const config = await this.getConfigBySource(CaptureSource.COLD_CALL);
    return this.processCaptureData(CaptureSource.COLD_CALL, dto, config);
  }

  private async processCaptureData(
    source: CaptureSource,
    dto: any,
    config?: LeadCaptureConfig | null,
    extra?: any,
  ) {
    const capture = this.captureRepo.create({
      source,
      rawData: extra?.rawData || dto,
      mappedData: this.mapFields(dto, config?.fieldMapping || {}),
      fieldMapping: config?.fieldMapping || {},
      ipAddress: extra?.ipAddress,
      userAgent: extra?.userAgent,
      referrer: extra?.referrer,
      sourceId: extra?.sourceId,
      utmSource: dto.utm_source,
      utmMedium: dto.utm_medium,
      utmCampaign: dto.utm_campaign,
      utmTerm: dto.utm_term,
      utmContent: dto.utm_content,
    });

    await this.captureRepo.save(capture);

    // Auto create lead if configured
    if (config?.autoCreateLead !== false) {
      try {
        const lead = await this.createLeadFromCapture(capture, config);
        capture.leadId = lead.id;
        capture.processed = true;
        await this.captureRepo.save(capture);
        return { capture, lead, success: true };
      } catch (error) {
        capture.processingError = (error as Error).message;
        await this.captureRepo.save(capture);
        return { capture, success: false, error: (error as Error).message };
      }
    }

    return { capture, success: true };
  }

  private async createLeadFromCapture(capture: LeadCapture, config?: LeadCaptureConfig | null): Promise<Lead> {
    const data = capture.mappedData || capture.rawData;
    
    // Check for duplicates if configured
    if (config?.deduplicateBy) {
      const existingLead = await this.findDuplicateLead(data, config.deduplicateBy);
      if (existingLead) {
        return existingLead;
      }
    }

    const lead = this.leadRepo.create({
      name: data.name || (data.firstName ? `${data.firstName || ''} ${data.lastName || ''}`.trim() : 'Unknown'),
      email: data.email,
      phone: data.phone,
      source: capture.source as any,
      assignedTo: config?.defaultAssignee,
    });

    return this.leadRepo.save(lead);
  }

  private async findDuplicateLead(data: any, deduplicateBy: string): Promise<Lead | null> {
    const where: any = {};
    
    if (deduplicateBy.includes('email') && data.email) {
      where.email = data.email;
    }
    if (deduplicateBy.includes('phone') && data.phone) {
      where.phone = data.phone;
    }

    if (Object.keys(where).length === 0) return null;
    return this.leadRepo.findOneBy(where);
  }

  private mapFields(data: any, fieldMapping: Record<string, string>): any {
    const mapped: any = { ...data };
    
    for (const [source, target] of Object.entries(fieldMapping)) {
      if (data[source] !== undefined) {
        mapped[target] = data[source];
      }
    }
    
    return mapped;
  }

  private mapFacebookData(dto: any): any {
    // Facebook Lead Ads format
    return {
      name: dto.full_name,
      email: dto.email,
      phone: dto.phone_number,
      company: dto.company_name,
      ...dto,
    };
  }

  private mapGoogleAdsData(dto: any): any {
    // Google Ads Lead Form format
    return {
      name: dto.user_column_data?.find((c: any) => c.column_id === 'FULL_NAME')?.string_value,
      email: dto.user_column_data?.find((c: any) => c.column_id === 'EMAIL')?.string_value,
      phone: dto.user_column_data?.find((c: any) => c.column_id === 'PHONE_NUMBER')?.string_value,
      ...dto,
    };
  }

  private mapPlatformToSource(platform: string): CaptureSource {
    const mapping: Record<string, CaptureSource> = {
      facebook: CaptureSource.FACEBOOK,
      instagram: CaptureSource.INSTAGRAM,
      google: CaptureSource.GOOGLE_ADS,
    };
    return mapping[platform.toLowerCase()] || CaptureSource.SOCIAL_MEDIA;
  }

  private async getConfigBySource(source: CaptureSource): Promise<LeadCaptureConfig | null> {
    return this.configRepo.findOneBy({ source, isActive: true });
  }

  // Config CRUD
  async getConfigs(): Promise<LeadCaptureConfig[]> {
    return this.configRepo.find();
  }

  async getConfig(id: number): Promise<LeadCaptureConfig | null> {
    return this.configRepo.findOneBy({ id });
  }

  async createConfig(dto: Partial<LeadCaptureConfig>): Promise<LeadCaptureConfig> {
    const config = this.configRepo.create(dto);
    return this.configRepo.save(config);
  }

  async updateConfig(id: number, dto: Partial<LeadCaptureConfig>): Promise<LeadCaptureConfig> {
    await this.configRepo.update(id, dto);
    const updated = await this.configRepo.findOneBy({ id });
    if (!updated) throw new NotFoundException(`Config ${id} not found`);
    return updated;
  }

  async deleteConfig(id: number): Promise<{ success: boolean }> {
    const result = await this.configRepo.delete(id);
    return { success: (result.affected ?? 0) > 0 };
  }

  // History & Processing
  async getHistory(limit = 100, source?: string): Promise<LeadCapture[]> {
    const query = this.captureRepo.createQueryBuilder('capture');
    
    if (source) {
      query.where('capture.source = :source', { source });
    }
    
    return query
      .orderBy('capture.capturedAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async processCapture(id: number): Promise<{ success: boolean; lead?: Lead }> {
    const capture = await this.captureRepo.findOneBy({ id });
    if (!capture) throw new NotFoundException(`Capture ${id} not found`);

    if (capture.processed) {
      throw new BadRequestException('Capture already processed');
    }

    const config = await this.getConfigBySource(capture.source);
    const lead = await this.createLeadFromCapture(capture, config);
    
    capture.leadId = lead.id;
    capture.processed = true;
    await this.captureRepo.save(capture);

    return { success: true, lead };
  }

  async getStats(): Promise<{
    totalCaptures: number;
    processedCaptures: number;
    capturesBySource: Record<string, number>;
    recentCaptures: number;
  }> {
    const total = await this.captureRepo.count();
    const processed = await this.captureRepo.count({ where: { processed: true } });
    
    const bySource = await this.captureRepo
      .createQueryBuilder('capture')
      .select('capture.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('capture.source')
      .getRawMany();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.captureRepo
      .createQueryBuilder('capture')
      .where('capture.capturedAt > :date', { date: oneDayAgo })
      .getCount();

    return {
      totalCaptures: total,
      processedCaptures: processed,
      capturesBySource: bySource.reduce((acc, r) => {
        acc[r.source] = parseInt(r.count, 10);
        return acc;
      }, {}),
      recentCaptures: recent,
    };
  }
}
