import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CallTraceService } from '../call-trace.service';
import { IvrLog } from '../../../ivr/entities/ivr-log.entity';
import { QueueLog } from '../../entities/queuelog.entity';
import { Cdr } from '../../entities/cdr.entity';
import { CallLog } from '../../entities/call-log.entity';

describe('CallTraceService', () => {
  let service: CallTraceService;

  const mockIvrLogRepo = {
    find: jest.fn(),
  };
  const mockQueueLogRepo = {
    find: jest.fn(),
  };
  const mockCdrRepo = {
    findOne: jest.fn(),
  };
  const mockCallLogRepo = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallTraceService,
        { provide: getRepositoryToken(IvrLog), useValue: mockIvrLogRepo },
        { provide: getRepositoryToken(QueueLog), useValue: mockQueueLogRepo },
        { provide: getRepositoryToken(Cdr), useValue: mockCdrRepo },
        { provide: getRepositoryToken(CallLog), useValue: mockCallLogRepo },
      ],
    }).compile();

    service = module.get<CallTraceService>(CallTraceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should compile', () => {
    expect(service).toBeDefined();
  });

  it('should aggregate logs correctly', async () => {
    const uniqueId = '12345.678';
    const now = new Date('2023-01-01T12:00:00Z');

    // Mock IVR Logs
    mockIvrLogRepo.find.mockResolvedValue([
      { createdAt: new Date(now.getTime()), event: 'CALL_START', channelId: uniqueId },
      { createdAt: new Date(now.getTime() + 1000), event: 'NODE_EXECUTE', nodeId: 'node1', channelId: uniqueId },
      { createdAt: new Date(now.getTime() + 2000), event: 'QUEUE_ENTER', meta: { queue: 'support' }, channelId: uniqueId },
    ]);

    // Mock Queue Logs
    mockQueueLogRepo.find.mockResolvedValue([
      { id: 1, callid: uniqueId, time: (now.getTime() / 1000 + 2).toString(), event: 'ENTERQUEUE', queuename: 'support' },
      { id: 2, callid: uniqueId, time: (now.getTime() / 1000 + 12).toString(), event: 'CONNECT', queuename: 'support', agent: 'Agent/101', data1: '10' }, // 10s wait
    ]);

    // Mock CDR
    mockCdrRepo.findOne.mockResolvedValue({
      uniqueid: uniqueId,
      calldate: now,
      duration: 60,
      disposition: 'ANSWERED',
      dst: 's',
      clid: '555-1234',
    });

    // Mock CallLog
    mockCallLogRepo.find.mockResolvedValue([]);

    const trace = await service.getCallTrace(uniqueId);

    expect(trace.uniqueId).toBe(uniqueId);
    expect(trace.timeline).toHaveLength(6); // 3 IVR + 2 Queue + 1 CDR

    // Check Summary
    expect(trace.summary.queueEntered).toBe(true);
    expect(trace.summary.queueName).toBe('support');
    expect(trace.summary.answered).toBe(true);
    expect(trace.summary.agentAnswered).toBe('Agent/101');
    expect(trace.summary.queueWaitTime).toBe(10);
    expect(trace.summary.duration).toBe(60);
  });

  it('should handle abandoned calls', async () => {
    const uniqueId = '12345.999';
    const now = new Date('2023-01-01T12:00:00Z');

    mockIvrLogRepo.find.mockResolvedValue([]);
    mockQueueLogRepo.find.mockResolvedValue([
       { id: 1, callid: uniqueId, time: (now.getTime() / 1000).toString(), event: 'ENTERQUEUE', queuename: 'sales' },
       { id: 2, callid: uniqueId, time: (now.getTime() / 1000 + 30).toString(), event: 'ABANDON', queuename: 'sales', data3: '30' },
    ]);
    mockCdrRepo.findOne.mockResolvedValue(null);
    mockCallLogRepo.find.mockResolvedValue([]);

    const trace = await service.getCallTrace(uniqueId);

    expect(trace.summary.queueEntered).toBe(true);
    expect(trace.summary.queueName).toBe('sales');
    expect(trace.summary.answered).toBe(false);
    expect(trace.summary.hangupBy).toBe('caller');
    expect(trace.summary.queueWaitTime).toBe(30);
  });

  it('should detect ignored agents and transfers', async () => {
    const uniqueId = '12345.XFER';
    const now = new Date();

    mockIvrLogRepo.find.mockResolvedValue([]);
    mockQueueLogRepo.find.mockResolvedValue([
      { id: 1, callid: uniqueId, time: (now.getTime() / 1000).toString(), event: 'ENTERQUEUE', queuename: 'support' },
      { id: 2, callid: uniqueId, time: (now.getTime() / 1000 + 5).toString(), event: 'RINGNOANSWER', agent: 'Agent/100', data1: '1000' },
      { id: 3, callid: uniqueId, time: (now.getTime() / 1000 + 10).toString(), event: 'RINGNOANSWER', agent: 'Agent/101', data1: '1000' },
      { id: 4, callid: uniqueId, time: (now.getTime() / 1000 + 20).toString(), event: 'TRANSFER', queuename: 'support', data1: '2000' },
    ]);
    mockCdrRepo.findOne.mockResolvedValue(null);
    mockCallLogRepo.find.mockResolvedValue([]);

    const trace = await service.getCallTrace(uniqueId);

    expect(trace.summary.queueEntered).toBe(true);
    expect(trace.summary.ignoredAgents).toEqual(['Agent/100', 'Agent/101']);
    expect(trace.summary.wasTransferred).toBe(true);
    expect(trace.summary.transferTarget).toBe('2000');
  });
});
