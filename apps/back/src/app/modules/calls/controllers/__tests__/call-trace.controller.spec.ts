import { Test, TestingModule } from '@nestjs/testing';
import { CallTraceController } from '../call-trace.controller';
import { CallTraceService } from '../../services/call-trace.service';
import { NotFoundException } from '@nestjs/common';

describe('CallTraceController', () => {
  let controller: CallTraceController;
  const mockCallTraceService = {
    getCallTrace: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CallTraceController],
      providers: [
        { provide: CallTraceService, useValue: mockCallTraceService },
      ],
    }).compile();

    controller = module.get<CallTraceController>(CallTraceController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return trace when found', async () => {
    const mockTrace = { uniqueId: '123', summary: {}, timeline: [] };
    mockCallTraceService.getCallTrace.mockResolvedValue(mockTrace);

    const result = await controller.getTrace('123');
    expect(result).toEqual(mockTrace);
    expect(mockCallTraceService.getCallTrace).toHaveBeenCalledWith('123');
  });

  it('should throw NotFoundException when trace is null', async () => {
    mockCallTraceService.getCallTrace.mockResolvedValue(null);

    await expect(controller.getTrace('999')).rejects.toThrow(NotFoundException);
    expect(mockCallTraceService.getCallTrace).toHaveBeenCalledWith('999');
  });
});
