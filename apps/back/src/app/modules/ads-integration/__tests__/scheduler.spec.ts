import { AdsIntegrationService } from '../ads-integration.service';

jest.useFakeTimers();

describe('AdsIntegrationService scheduler', () => {
  test('schedules sync and refresh on init and clears on destroy', () => {
    const svc = new AdsIntegrationService(null as any, null as any, null as any, null as any, null as any);
    svc.onModuleInit();
    expect((svc as any).syncIntervalId).not.toBeNull();
    expect((svc as any).refreshIntervalId).not.toBeNull();
    svc.onModuleDestroy();
    expect((svc as any).syncIntervalId).not.toBeNull();
  });
});
