import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CallAggregationService } from '../call-aggregation.service';
import { CallTraceService } from '../call-trace.service';
import { Cdr } from '../../entities/cdr.entity';
import { CallSummary } from '../../entities/call-summary.entity';

describe('CallAggregationService', () => {
  let service: CallAggregationService;
  const mockCdrRepo = {
    find: jest.fn(),
  };
  const mockSummaryRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockTraceService = {
    getCallTrace: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallAggregationService,
        { provide: getRepositoryToken(Cdr), useValue: mockCdrRepo },
        { provide: getRepositoryToken(CallSummary), useValue: mockSummaryRepo },
        { provide: CallTraceService, useValue: mockTraceService },
      ],
    }).compile();

    service = module.get<CallAggregationService>(CallAggregationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process new CDRs', async () => {
    const now = new Date();
    const cdr = { id: 101, uniqueid: '123', calldate: now };

    mockSummaryRepo.find.mockResolvedValue([]); // No existing summaries (lastId = 0)
    mockCdrRepo.find.mockResolvedValue([cdr]); // 1 new CDR
    mockSummaryRepo.findOne.mockResolvedValue(null); // Not already processed

    mockTraceService.getCallTrace.mockResolvedValue({
      uniqueId: '123',
      timeline: [
        { type: 'IVR', event: 'NODE_EXECUTE', details: { nodeName: 'Welcome' } },
        { type: 'IVR', event: 'NODE_EXECUTE', details: { nodeName: 'Menu' } },
      ],
      summary: {
        startTime: now,
        endTime: new Date(now.getTime() + 60000),
        duration: 60,
        caller: '555',
        destination: '100',
        status: 'ANSWERED',
        answered: true,
        queueEntered: false,
      },
    });

    mockSummaryRepo.create.mockImplementation((dto) => dto);
    mockSummaryRepo.save.mockResolvedValue({});

    await service.aggregateRecentCalls();

    expect(mockTraceService.getCallTrace).toHaveBeenCalledWith('123');
    expect(mockSummaryRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      uniqueId: '123',
      cdrId: 101,
      status: 'ANSWERED',
      ivrPath: 'Welcome -> Menu',
    }));
  });
});
