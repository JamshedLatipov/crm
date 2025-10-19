import { LeadScoringService } from './lead-scoring.service';
import { ScoringRuleType } from '../entities/lead-scoring-rule.entity';
import { ActivityType } from '../entities/lead-activity.entity';

describe('LeadScoringService', () => {
  let service: LeadScoringService;

  const mockLeadRepo: any = {
    findOneBy: jest.fn(),
    update: jest.fn()
  };

  const mockScoringRuleRepo: any = {
    find: jest.fn()
  };

  const mockActivityRepo: any = {
    save: jest.fn()
  };

  const mockLeadScoreRepo: any = {
    findOne: jest.fn(),
    save: jest.fn()
  };

  const mockNotificationRuleService: any = {
    evaluateRules: jest.fn()
  };

  const mockAssignmentService: any = {
    getCurrentAssignments: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeadScoringService(
      mockLeadRepo,
      mockScoringRuleRepo,
      mockActivityRepo,
      mockLeadScoreRepo,
      mockNotificationRuleService,
      mockAssignmentService
    );
  });

  it('throws when lead not found', async () => {
    mockLeadRepo.findOneBy.mockResolvedValueOnce(null);

    await expect(service.calculateScore(123, { lead: null as any })).rejects.toThrow('Lead not found');
    expect(mockLeadRepo.findOneBy).toHaveBeenCalledWith({ id: 123 });
  });

  it('applies a simple email-opened rule and saves score, activity and triggers notifications', async () => {
    const lead = {
      id: 1,
      score: 0,
      name: 'Test Lead',
      email: 'test@example.com',
      phone: null,
      company: null,
      position: null,
      status: 'new',
      source: 'web',
      estimatedValue: null
    } as any;

    const rule = {
      id: 10,
      name: 'Email Opened',
      type: ScoringRuleType.EMAIL_OPENED,
      points: 15,
      conditions: null,
      isActive: true
    } as any;

    mockLeadRepo.findOneBy.mockResolvedValueOnce(lead);
    mockScoringRuleRepo.find.mockResolvedValueOnce([rule]);
    mockLeadScoreRepo.findOne.mockResolvedValueOnce(null);
    mockLeadScoreRepo.save.mockResolvedValueOnce({});
    mockActivityRepo.save.mockResolvedValueOnce({});
    mockLeadRepo.update.mockResolvedValueOnce({});
    mockAssignmentService.getCurrentAssignments.mockResolvedValueOnce([]);

    const result = await service.calculateScore(1, { lead: lead, activity: { type: ActivityType.EMAIL_OPENED } as any });

  // final score should equal rule.points but capped by criteria maxima (emailEngagement max = 10)
  const expected = Math.min(rule.points, 10);
  expect(result).toBe(expected);

  // should update lead score
  expect(mockLeadRepo.update).toHaveBeenCalledWith(1, { score: expected });

    // should save a leadScore record
    expect(mockLeadScoreRepo.save).toHaveBeenCalled();

    // should record activity for applied rule
    expect(mockActivityRepo.save).toHaveBeenCalled();

    // notifications should be evaluated because absolute change >= 10
    expect(mockNotificationRuleService.evaluateRules).toHaveBeenCalled();
  });
});
