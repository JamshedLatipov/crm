import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdLeadRecord } from './entities/ad-lead-record.entity';
import { AdCampaign } from './entities/ad-campaign.entity';
import { AdCampaignMetric } from './entities/ad-campaign-metric.entity';
import { AdAccount } from './entities/ad-account.entity';
import axios from 'axios';
import { LeadService } from '../leads/lead.service';
import { LeadSource } from '../leads/lead.entity';

@Injectable()
export class AdsIntegrationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdsIntegrationService.name);
  private syncIntervalId: any = null;
  private refreshIntervalId: any = null;
  constructor(
    @InjectRepository(AdLeadRecord)
    private readonly recordRepo: Repository<AdLeadRecord>,
    @InjectRepository(AdCampaign)
    private readonly campaignRepo: Repository<AdCampaign>,
    @InjectRepository(AdCampaignMetric)
    private readonly metricRepo: Repository<AdCampaignMetric>,
    @InjectRepository(AdAccount)
    private readonly accountRepo: Repository<AdAccount>,
    private readonly leadService: LeadService
  ) {}

  onModuleInit() {
    const syncMin = Number(process.env.ADS_SYNC_INTERVAL_MIN || '60');
    const refreshMin = Number(process.env.ADS_REFRESH_INTERVAL_MIN || '60');
    // schedule sync
    this.syncIntervalId = setInterval(() => {
      this.logger.log('Scheduled ads sync triggered');
      this.syncFacebookOnce().catch(err => this.logger.error('Scheduled sync error', err?.message || err));
    }, Math.max(1, syncMin) * 60 * 1000);

    this.refreshIntervalId = setInterval(() => {
      this.logger.log('Scheduled token refresh triggered');
      this.refreshFacebookTokens().catch(err => this.logger.error('Scheduled refresh error', err?.message || err));
    }, Math.max(1, refreshMin) * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.syncIntervalId) clearInterval(this.syncIntervalId);
    if (this.refreshIntervalId) clearInterval(this.refreshIntervalId);
  }

  async handleIncomingLead(payload: any, source: 'google' | 'facebook' | 'other') {
    // Persist raw record for auditing
    const record = this.recordRepo.create({ ...payload, source } as any);
    await this.recordRepo.save(record as any);

    // Map to Lead creation DTO
    const leadData: any = {
      name: payload.name || `${payload.firstName || ''} ${payload.lastName || ''}`.trim() || 'Lead from ad',
      email: payload.email || null,
      phone: payload.phone || null,
      source: source === 'google' ? LeadSource.GOOGLE_ADS : LeadSource.FACEBOOK,
      sourceDetails: JSON.stringify({ platform: source, raw: payload }),
      campaign: payload.campaign || payload.campaignName || null,
      utmSource: payload.utmSource || null,
      utmCampaign: payload.utmCampaign || null,
      utmMedium: payload.utmMedium || null,
      customFields: payload.customFields || null,
    };

    try {
      const created = await this.leadService.create(leadData, 'system', 'ads-webhook');
      this.logger.log(`Created lead ${created.id} from ${source} campaign=${leadData.campaign}`);
      return created;
    } catch (err) {
      this.logger.error('Failed to create lead from ad payload', err?.message || err);
      throw err;
    }
  }

  async listCampaigns(): Promise<AdCampaign[]> {
    return this.campaignRepo.find({ relations: ['account'] });
  }

  async getCampaignMetrics(campaignId: number): Promise<AdCampaignMetric[]> {
    return this.metricRepo.find({ where: { campaign: { id: campaignId } } as any, order: { date: 'DESC' } });
  }

  async updateCampaign(campaignId: number, data: Partial<AdCampaign>): Promise<AdCampaign> {
    await this.campaignRepo.update(campaignId, data as any);
    return this.campaignRepo.findOne({ where: { id: campaignId }, relations: ['account'] }) as Promise<AdCampaign>;
  }

  async pauseCampaign(campaignId: number): Promise<AdCampaign> {
    return this.updateCampaign(campaignId, { status: 'paused' });
  }

  async resumeCampaign(campaignId: number): Promise<AdCampaign> {
    return this.updateCampaign(campaignId, { status: 'active' });
  }

  async handleFacebookOAuthCallback(code: string) {
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    const redirectUri = process.env.FB_OAUTH_REDIRECT || 'http://localhost:3000/api/ads/facebook/oauth/callback';
    // Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/v17.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
    const resp = await axios.get(tokenUrl);
    const data = resp.data;

    // Exchange short-lived token for long-lived token
    const longToken = await this.exchangeShortLivedToLongLived(data.access_token);

    // Save account token (basic) - in real world we'd map to a user/account
    const expiresAt = new Date(Date.now() + (60 * 24 * 3600 * 1000)); // ~60 days
    const account = this.accountRepo.create({ platform: 'facebook', raw: data, accessToken: longToken.access_token, tokenExpiresAt: expiresAt });
    await this.accountRepo.save(account as any);
    return account;
  }

  async exchangeShortLivedToLongLived(shortToken: string) {
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    const exchUrl = `https://graph.facebook.com/v17.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
    const r = await axios.get(exchUrl);
    return r.data; // contains access_token and expires_in
  }

  async refreshFacebookTokens() {
    // For each account with an accessToken, attempt to extend it (FB long-lived exchange)
    const accounts = await this.accountRepo.find();
    const updated: any[] = [];
    for (const acc of accounts) {
      try {
        if (!acc.accessToken) continue;
        const extended = await this.exchangeShortLivedToLongLived(acc.accessToken);
        const expiresAt = new Date(Date.now() + ((extended.expires_in || 60 * 24 * 3600) * 1000));
        await this.accountRepo.update(acc.id, { accessToken: extended.access_token, tokenExpiresAt: expiresAt } as any);
        updated.push({ id: acc.id, nowExpiresAt: expiresAt });
      } catch (err) {
        this.logger.warn('Failed to refresh token for account', acc.id, err?.message || err);
      }
    }
    return { refreshed: updated.length, details: updated };
  }

  async listAccountsForUser(userId: number) {
    return this.accountRepo.find({ where: { userId } as any });
  }

  async linkAccountToUser(accountId: number, userId: number) {
    await this.accountRepo.update(accountId, { userId } as any);
    return this.accountRepo.findOne({ where: { id: accountId } as any });
  }

  async unlinkAccount(accountId: number, userId?: number) {
    // Optionally enforce ownership
    if (userId) {
      const acc = await this.accountRepo.findOne({ where: { id: accountId } as any });
      if (!acc || acc.userId !== userId) throw new Error('Not owner');
    }
    await this.accountRepo.update(accountId, { userId: null, accessToken: null, refreshToken: null, tokenExpiresAt: null } as any);
    return { success: true };
  }

  async syncFacebookOnce() {
    // Get all FB accounts with tokens
    const accounts = await this.accountRepo.find();
    const results: any[] = [];
    for (const acc of accounts) {
      if (!acc.accessToken) continue;
      try {
        // 1) get ad accounts
        const adAccountsUrl = `https://graph.facebook.com/v17.0/me/adaccounts?access_token=${acc.accessToken}`;
        const adAccResp = await axios.get(adAccountsUrl);
        const adAccounts = adAccResp.data.data || [];

        for (const a of adAccounts) {
          // 2) fetch campaigns for ad account
          const campaignsUrl = `https://graph.facebook.com/v17.0/${a.id}/campaigns?access_token=${acc.accessToken}&fields=id,name,status`;
          const campResp = await axios.get(campaignsUrl);
          const campaigns = campResp.data.data || [];
          for (const c of campaigns) {
            // upsert campaign
            let existing = await this.campaignRepo.findOne({ where: { campaignId: String(c.id) } as any });
            if (!existing) {
              existing = this.campaignRepo.create({ campaignId: String(c.id), name: c.name, status: c.status, account: acc as any, raw: c });
              await this.campaignRepo.save(existing as any);
            } else {
              await this.campaignRepo.update(existing.id, { name: c.name, status: c.status, raw: c } as any);
            }

            // 3) fetch insights (last 7 days)
            const since = Math.floor((Date.now() - 7 * 24 * 3600 * 1000) / 1000);
            const until = Math.floor(Date.now() / 1000);
            const insightsUrl = `https://graph.facebook.com/v17.0/${c.id}/insights?access_token=${acc.accessToken}&fields=date_start,date_stop,impressions,clicks,actions,spend&time_range={'since':'${new Date(since*1000).toISOString().slice(0,10)}','until':'${new Date(until*1000).toISOString().slice(0,10)}'}`;
            try {
              const insResp = await axios.get(insightsUrl);
              const data = insResp.data.data || [];
              for (const d of data) {
                const metric = this.metricRepo.create({ campaign: existing as any, date: d.date_start, impressions: Number(d.impressions || 0), clicks: Number(d.clicks || 0), cost: Number(d.spend || 0), leads: 0 });
                await this.metricRepo.save(metric as any);
                results.push(metric);
              }
            } catch (err) {
              // log and continue
              this.logger.warn('Failed to fetch insights for campaign', c.id, err?.message || err);
            }
          }
        }
      } catch (err) {
        this.logger.warn('Failed to sync account', acc.id, err?.message || err);
      }
    }
    return { synced: results.length };
  }

  // Dev helper: seed sample ads data (non-migration) - safe to call multiple times
  async seedAds() {
    // Only add if no accounts exist
    const existing = await this.accountRepo.count();
    if (existing > 0) return { seeded: 0 };
    const acc1 = this.accountRepo.create({ platform: 'facebook', accountId: 'fb_dev_1', name: 'FB Dev Account', raw: {} });
    const acc2 = this.accountRepo.create({ platform: 'google', accountId: 'ga_dev_2', name: 'GA Dev Account', raw: {} });
    await this.accountRepo.save([acc1 as any, acc2 as any]);

    const c1 = this.campaignRepo.create({ campaignId: 'fb_dev_c1', name: 'FB Dev Campaign 1', status: 'active', account: acc1 as any });
    const c2 = this.campaignRepo.create({ campaignId: 'ga_dev_c2', name: 'GA Dev Campaign 2', status: 'active', account: acc2 as any });
    await this.campaignRepo.save([c1 as any, c2 as any]);

    const metrics = [];
    for (let i = 1; i <= 5; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      metrics.push(this.metricRepo.create({ campaign: c1 as any, date: d.toISOString().slice(0,10), impressions: 1000 + i*10, clicks: 30 + i, leads: 2 + Math.floor(i/2), cost: 20 + i } as any));
      metrics.push(this.metricRepo.create({ campaign: c2 as any, date: d.toISOString().slice(0,10), impressions: 800 + i*8, clicks: 20 + i, leads: 1 + Math.floor(i/3), cost: 15 + i } as any));
    }
    await this.metricRepo.save(metrics as any);
    return { seeded: 1 };
  }

  async refreshAccount(accountId: number) {
    const acc = await this.accountRepo.findOne({ where: { id: accountId } as any });
    if (!acc) throw new Error('Account not found');
    if (!acc.accessToken) throw new Error('No token to refresh');
    try {
      const extended = await this.exchangeShortLivedToLongLived(acc.accessToken);
      const expiresAt = new Date(Date.now() + ((extended.expires_in || 60 * 24 * 3600) * 1000));
      await this.accountRepo.update(acc.id, { accessToken: extended.access_token, tokenExpiresAt: expiresAt } as any);
      return { id: acc.id, nowExpiresAt: expiresAt };
    } catch (err) {
      this.logger.warn('Failed to refresh token for account', acc.id, err?.message || err);
      throw err;
    }
  }
}
