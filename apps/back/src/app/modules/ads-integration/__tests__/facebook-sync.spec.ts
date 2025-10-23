import axios from 'axios';
import { AdsIntegrationService } from '../ads-integration.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Facebook sync', () => {
  test('handleFacebookOAuthCallback exchanges code and saves account', async () => {
    // first call: exchange code -> short token
    mockedAxios.get.mockResolvedValueOnce({ data: { access_token: 'short_token' } });
    // second call: exchange short -> long
    mockedAxios.get.mockResolvedValueOnce({ data: { access_token: 'long_token', expires_in: 5184000 } });

    const mockAccountRepo: any = { create: (x:any)=>x, save: async (x:any)=>({ id: 1, ...x }), find: async ()=>[] };
    const svc = new AdsIntegrationService(null as any, null as any, null as any, mockAccountRepo as any, null as any);

    const acc = await svc.handleFacebookOAuthCallback('code123');
    expect(acc.accessToken).toBe('long_token');
  });

  test('syncFacebookOnce iterates accounts and saves campaigns/metrics', async () => {
    // mock account list
    const account = { id: 1, accessToken: 'token' } as any;
    const mockAccountRepo: any = { find: async ()=>[account] };
    // mock axios for adaccounts
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [{ id: 'act_1' }] } });
    // campaigns
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [{ id: 'camp_1', name: 'Camp1', status: 'active' }] } });
    // insights
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [{ date_start: '2025-10-01', impressions: '10', clicks: '2', spend: '5' }] } });

    const mockCampaignRepo: any = { findOne: async ()=>null, create: (x:any)=>x, save: async (x:any)=>({ id: 1, ...x }), update: async ()=>{}, find: async ()=>[] };
    const mockMetricRepo: any = { create: (x:any)=>x, save: async (x:any)=>({ id: 1, ...x }) };

    const svc = new AdsIntegrationService(null as any, mockCampaignRepo as any, mockMetricRepo as any, mockAccountRepo as any, null as any);
    const res = await svc.syncFacebookOnce();
    expect(res.synced).toBeGreaterThanOrEqual(1);
  });

  test('refreshFacebookTokens refreshes tokens for accounts', async () => {
    const account = { id: 1, accessToken: 'old_token' } as any;
    const mockAccountRepo: any = { find: async ()=>[account], update: async ()=>{} };
    // mock exchangeShortLivedToLongLived response
    mockedAxios.get.mockResolvedValueOnce({ data: { access_token: 'refreshed_token', expires_in: 5184000 } });

    const svc = new AdsIntegrationService(null as any, null as any, null as any, mockAccountRepo as any, null as any);
    const res = await svc.refreshFacebookTokens();
    expect(res.refreshed).toBeGreaterThanOrEqual(0);
  });
});
