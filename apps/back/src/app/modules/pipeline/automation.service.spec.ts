import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationService } from './automation.service';
import { PipelineService } from './pipeline.service';
import { AutomationRule, AutomationTrigger, AutomationCondition, AutomationAction } from './pipeline.entity';
import { Deal } from '../deals/deal.entity';
import { Lead } from '../leads/lead.entity';
import { DealsService } from '../deals/deals.service';
import { LeadService } from '../leads/lead.service';

describe('AutomationService', () => {
  let service: AutomationService;
  let automationRulesRepo: Repository<AutomationRule>;
  let dealsService: DealsService;
  let leadService: LeadService;

  const mockAutomationRulesRepo = {
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockPipelineService = {
    // Mock methods if needed
  };

  const mockDealsService = {
    moveToStage: jest.fn(),
    updateDeal: jest.fn(),
    assignDeal: jest.fn(),
    updateProbability: jest.fn(),
  };

  const mockLeadService = {
    changeStatus: jest.fn(),
    assignLead: jest.fn(),
    scoreLead: jest.fn(),
    addTags: jest.fn(),
    removeTags: jest.fn(),
    addNote: jest.fn(),
    scheduleFollowUp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        {
          provide: getRepositoryToken(AutomationRule),
          useValue: mockAutomationRulesRepo,
        },
        {
          provide: PipelineService,
          useValue: mockPipelineService,
        },
        {
          provide: DealsService,
          useValue: mockDealsService,
        },
        {
          provide: LeadService,
          useValue: mockLeadService,
        },
      ],
    }).useMocker(() => ({}))
      .compile();

    service = module.get<AutomationService>(AutomationService);
    automationRulesRepo = module.get<Repository<AutomationRule>>(getRepositoryToken(AutomationRule));
    dealsService = module.get<DealsService>(DealsService);
    leadService = module.get<LeadService>(LeadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeChangeStage', () => {
    it('should call dealsService.moveToStage for deal entity', async () => {
      const config = { stageId: 'stage123' };
      const context = {
        entityType: 'deal' as const,
        entityId: 'deal1',
        entity: {} as Deal,
        trigger: AutomationTrigger.DEAL_CREATED,
      };

      mockDealsService.moveToStage.mockResolvedValue({} as any);

      await (service as any).executeChangeStage(config, context);

      expect(mockDealsService.moveToStage).toHaveBeenCalledWith('deal1', 'stage123', undefined, undefined);
    });

    it('should not call dealsService for lead entity', async () => {
      const config = { stageId: 'stage123' };
      const context = {
        entityType: 'lead' as const,
        entityId: '1',
        entity: {} as Lead,
        trigger: AutomationTrigger.LEAD_CREATED,
      };

      await (service as any).executeChangeStage(config, context);

      expect(mockDealsService.moveToStage).not.toHaveBeenCalled();
    });
  });

  describe('executeChangeStatus', () => {
    it('should call dealsService.updateDeal for deal entity', async () => {
      const config = { status: 'won' };
      const context = {
        entityType: 'deal' as const,
        entityId: 'deal1',
        entity: {} as Deal,
        trigger: AutomationTrigger.DEAL_CREATED,
      };

      mockDealsService.updateDeal.mockResolvedValue({} as any);

      await (service as any).executeChangeStatus(config, context);

      expect(mockDealsService.updateDeal).toHaveBeenCalledWith('deal1', { status: 'won' }, undefined, undefined);
    });

    it('should call leadService.changeStatus for lead entity', async () => {
      const config = { status: 'qualified' };
      const context = {
        entityType: 'lead' as const,
        entityId: '1',
        entity: {} as Lead,
        trigger: AutomationTrigger.LEAD_CREATED,
      };

      mockLeadService.changeStatus.mockResolvedValue({} as any);

      await (service as any).executeChangeStatus(config, context);

      expect(mockLeadService.changeStatus).toHaveBeenCalledWith(1, 'qualified', undefined, undefined);
    });
  });

  describe('executeAssignToUser', () => {
    it('should call dealsService.assignDeal for deal entity', async () => {
      const config = { userId: 'user123' };
      const context = {
        entityType: 'deal' as const,
        entityId: 'deal1',
        entity: {} as Deal,
        trigger: AutomationTrigger.DEAL_CREATED,
      };

      mockDealsService.assignDeal.mockResolvedValue({} as any);

      await (service as any).executeAssignToUser(config, context);

      expect(mockDealsService.assignDeal).toHaveBeenCalledWith('deal1', 'user123', undefined, undefined);
    });

    it('should call leadService.assignLead for lead entity', async () => {
      const config = { userId: 'user123' };
      const context = {
        entityType: 'lead' as const,
        entityId: '1',
        entity: {} as Lead,
        trigger: AutomationTrigger.LEAD_CREATED,
      };

      mockLeadService.assignLead.mockResolvedValue({} as any);

      await (service as any).executeAssignToUser(config, context);

      expect(mockLeadService.assignLead).toHaveBeenCalledWith(1, 'user123', undefined, undefined);
    });
  });

  describe('executeUpdateAmount', () => {
    it('should call dealsService.updateDeal for deal entity', async () => {
      const config = { amount: 50000 };
      const context = {
        entityType: 'deal' as const,
        entityId: 'deal1',
        entity: {} as Deal,
        trigger: AutomationTrigger.DEAL_CREATED,
      };

      mockDealsService.updateDeal.mockResolvedValue({} as any);

      await (service as any).executeUpdateAmount(config, context);

      expect(mockDealsService.updateDeal).toHaveBeenCalledWith('deal1', { amount: 50000 }, undefined, undefined);
    });
  });

  describe('executeUpdateScore', () => {
    it('should call leadService.scoreLead for lead entity', async () => {
      const config = { score: 85 };
      const context = {
        entityType: 'lead' as const,
        entityId: '1',
        entity: {} as Lead,
        trigger: AutomationTrigger.LEAD_CREATED,
      };

      mockLeadService.scoreLead.mockResolvedValue({} as any);

      await (service as any).executeUpdateScore(config, context);

      expect(mockLeadService.scoreLead).toHaveBeenCalledWith(1, 85, undefined, undefined);
    });
  });
});