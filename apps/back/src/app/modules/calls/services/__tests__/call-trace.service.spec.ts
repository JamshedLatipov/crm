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
    find: jest.fn(),
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
    mockCdrRepo.find.mockResolvedValue([{
      uniqueid: uniqueId,
      calldate: now,
      duration: 60,
      disposition: 'ANSWERED',
      dst: 's',
      clid: '555-1234',
    }]);

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
    mockCdrRepo.find.mockResolvedValue([]);
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
    mockCdrRepo.find.mockResolvedValue([]);
    mockCallLogRepo.find.mockResolvedValue([]);

    const trace = await service.getCallTrace(uniqueId);

    expect(trace.summary.queueEntered).toBe(true);
    expect(trace.summary.ignoredAgents).toEqual(['Agent/100', 'Agent/101']);
    expect(trace.summary.wasTransferred).toBe(true);
    expect(trace.summary.transferTarget).toBe('2000');
  });

  it('should detect ignored agents with RINGCANCELED event', async () => {
    const uniqueId = '12345.CANCELED';
    const now = new Date();

    mockIvrLogRepo.find.mockResolvedValue([]);
    mockQueueLogRepo.find.mockResolvedValue([
      { id: 1, callid: uniqueId, time: (now.getTime() / 1000).toString(), event: 'ENTERQUEUE', queuename: 'Support' },
      { id: 2, callid: uniqueId, time: (now.getTime() / 1000 + 5).toString(), event: 'RINGCANCELED', agent: 'PJSIP/operator1', data1: '76' },
      { id: 3, callid: uniqueId, time: (now.getTime() / 1000 + 10).toString(), event: 'RINGCANCELED', agent: 'PJSIP/operator2', data1: '76' },
      { id: 4, callid: uniqueId, time: (now.getTime() / 1000 + 11).toString(), event: 'EXITWITHKEY', queuename: 'Support', data3: '11' },
    ]);
    mockCdrRepo.find.mockResolvedValue([]);
    mockCallLogRepo.find.mockResolvedValue([]);

    const trace = await service.getCallTrace(uniqueId);

    expect(trace.summary.queueEntered).toBe(true);
    expect(trace.summary.ignoredAgents).toEqual(['PJSIP/operator1', 'PJSIP/operator2']);
    expect(trace.summary.answered).toBe(false);
    expect(trace.summary.hangupBy).toBe('caller_key');
  });

  it('should handle multiple CDRs for single call (queue then menu)', async () => {
    const uniqueId = '1766481371.14';
    const now = new Date('2023-12-23T09:16:11Z');

    mockIvrLogRepo.find.mockResolvedValue([
      { channelId: uniqueId, createdAt: new Date(now.getTime()), event: 'CALL_START', caller: 'operator1' },
      { channelId: uniqueId, createdAt: new Date(now.getTime() + 1000), event: 'NODE_EXECUTE', nodeId: 'n1', nodeName: '1000' },
      { channelId: uniqueId, createdAt: new Date(now.getTime() + 5000), event: 'NODE_EXECUTE', nodeId: 'n2', nodeName: 'greating' },
      { channelId: uniqueId, createdAt: new Date(now.getTime() + 11000), event: 'NODE_EXECUTE', nodeId: 'n3', nodeName: 'support' },
      { channelId: uniqueId, createdAt: new Date(now.getTime() + 11100), event: 'QUEUE_ENTER', meta: { queue: 'Support' } },
    ]);
    mockQueueLogRepo.find.mockResolvedValue([
      { id: 1, callid: uniqueId, time: (now.getTime() / 1000 + 11.5).toString(), event: 'ENTERQUEUE', queuename: 'Support', agent: 'NONE' },
      { id: 2, callid: uniqueId, time: (now.getTime() / 1000 + 11.6).toString(), event: 'RINGCANCELED', agent: 'PJSIP/operator2', data1: '76' },
      { id: 3, callid: uniqueId, time: (now.getTime() / 1000 + 11.7).toString(), event: 'EXITWITHKEY', queuename: 'Support', data3: '1', data1: '2' },
    ]);
    // Two CDRs: first for queue attempt (NO ANSWER), second for menu navigation (ANSWERED)
    mockCdrRepo.find.mockResolvedValue([
      { uniqueid: uniqueId, calldate: now, duration: 11, disposition: 'NO ANSWER', dst: 'queue_Support', clid: '"" <operator1>', sequence: 10 },
      { uniqueid: uniqueId, calldate: new Date(now.getTime() + 11000), duration: 13, disposition: 'ANSWERED', dst: '2', clid: '"" <operator1>', sequence: 12 },
    ]);
    mockCallLogRepo.find.mockResolvedValue([]);

    const trace = await service.getCallTrace(uniqueId);

    // Should use last CDR (sequence 12) as primary
    expect(trace.summary.duration).toBe(13);
    expect(trace.summary.status).toBe('ANSWERED');
    expect(trace.summary.destination).toBe('2');
    expect(trace.summary.queueEntered).toBe(true);
    expect(trace.summary.ignoredAgents).toEqual(['PJSIP/operator2']);
    expect(trace.summary.answered).toBe(false); // Not answered by agent in queue
    expect(trace.summary.hangupBy).toBe('caller_key');
    expect(trace.timeline.length).toBe(10); // 5 IVR + 3 Queue + 2 CDR
  });
});
