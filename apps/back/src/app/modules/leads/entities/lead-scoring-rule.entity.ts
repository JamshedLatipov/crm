import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ScoringRuleType {
  EMAIL_OPENED = 'email_opened',
  EMAIL_CLICKED = 'email_clicked',
  WEBSITE_VISIT = 'website_visit',
  FORM_SUBMITTED = 'form_submitted',
  DOWNLOAD = 'download',
  WEBINAR_ATTENDED = 'webinar_attended',
  DEMO_REQUESTED = 'demo_requested',
  PHONE_CALL = 'phone_call',
  MEETING_SCHEDULED = 'meeting_scheduled',
  PROPOSAL_VIEWED = 'proposal_viewed',
  PRICE_PAGE_VIEWED = 'price_page_viewed',
  CONTACT_INFO_PROVIDED = 'contact_info_provided',
  COMPANY_SIZE = 'company_size',
  INDUSTRY_MATCH = 'industry_match',
  BUDGET_INDICATED = 'budget_indicated',
  DECISION_MAKER = 'decision_maker'
}

@Entity('lead_scoring_rules')
export class LeadScoringRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: ScoringRuleType
  })
  type: ScoringRuleType;

  @Column({ type: 'int' })
  points: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  conditions: Record<string, string | number | boolean>; // Условия для применения правила

  @Column({ type: 'int', default: 0 })
  priority: number; // Приоритет применения правила

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
