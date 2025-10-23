import { AdsIntegrationService } from '../ads-integration.service';

describe('AdsIntegrationService', () => {
  test('handleIncomingLead maps fields and calls leadService.create', async () => {
  const records: any[] = [];
  const mockRecordRepo: any = { create: (x: any) => x, save: async (x: any) => ({ id: 1, ...x }) };
  const mockCampaignRepo: any = { findOne: async ()=>null, create: (x:any)=>x, save: async (x:any)=>({ id: 1, ...x }), update: async ()=>{} };
  const mockMetricRepo: any = { create: (x:any)=>x, save: async (x:any)=>({ id: 1, ...x }) };
  const mockAccountRepo: any = { create: (x:any)=>x, save: async (x:any)=>({ id: 1, ...x }), find: async ()=>[] };
  const mockLeadService: any = { create: jest.fn(async (data: any) => ({ id: 123, ...data })) };

  const svc = new AdsIntegrationService(mockRecordRepo as any, mockCampaignRepo as any, mockMetricRepo as any, mockAccountRepo as any, mockLeadService as any);

    const payload = { email: 'z@z.com', phone: '+7', name: 'Zed', campaign: 'Camp1' };
    const res = await svc.handleIncomingLead(payload, 'google');

    expect(res.id).toBe(123);
    expect(mockLeadService.create).toHaveBeenCalled();
    expect(res.email).toBe('z@z.com');
  });
});
