import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { LeadScoreBadgeComponent } from '../lead-score-badge/lead-score-badge.component';

export interface LeadScoreDetails {
  leadId: number;
  totalScore: number;
  temperature: 'cold' | 'warm' | 'hot';
  lastCalculatedAt: Date;
  criteria: {
    profileCompletion: number;
    jobTitleMatch: number;
    companySize: number;
    industryMatch: number;
    websiteActivity: number;
    emailEngagement: number;
    formSubmissions: number;
    contentDownloads: number;
    responseTime: number;
    communicationFrequency: number;
    meetingAttendance: number;
    budgetConfirmed: number;
    decisionMaker: number;
    timeframeDefined: number;
  };
  scoreHistory?: {
    date: Date;
    score: number;
    changes: any;
    reason?: string;
  }[];
}

interface ScoreCriteriaGroup {
  name: string;
  icon: string;
  maxScore: number;
  items: {
    key: keyof LeadScoreDetails['criteria'];
    label: string;
    maxPoints: number;
  }[];
}

@Component({
  selector: 'app-lead-score-details',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    MatTooltipModule, 
    MatProgressBarModule, 
    MatCardModule, 
    MatButtonModule,
    LeadScoreBadgeComponent
  ],
  template: `
    <mat-card class="lead-score-details">
      <mat-card-header>
        <div mat-card-avatar>
          <app-lead-score-badge 
            [score]="scoreDetails?.totalScore || 0"
            [temperature]="scoreDetails?.temperature || 'cold'"
            [showProgress]="false"
            size="large">
          </app-lead-score-badge>
        </div>
        <mat-card-title>Lead Score: {{ scoreDetails?.totalScore || 0 }}/100</mat-card-title>
        <mat-card-subtitle>
          Последний расчет: {{ scoreDetails?.lastCalculatedAt | date:'short':'ru' }}
        </mat-card-subtitle>
        <button mat-icon-button (click)="toggleExpanded()">
          <mat-icon>{{ expanded ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
      </mat-card-header>

      <mat-card-content *ngIf="expanded">
        <div class="score-breakdown">
          <div class="score-group" *ngFor="let group of scoreCriteriaGroups">
            <div class="score-group__header">
              <mat-icon>{{ group.icon }}</mat-icon>
              <h4>{{ group.name }}</h4>
              <span class="score-group__total">
                {{ getGroupScore(group) }}/{{ group.maxScore }}
              </span>
            </div>

            <div class="score-group__items">
              <div class="score-item" *ngFor="let item of group.items">
                <div class="score-item__info">
                  <span class="score-item__label">{{ item.label }}</span>
                  <span class="score-item__score">
                    {{ scoreDetails?.criteria[item.key] || 0 }}/{{ item.maxPoints }}
                  </span>
                </div>
                <mat-progress-bar 
                  mode="determinate" 
                  [value]="getItemPercentage(item)"
                  [color]="getProgressColor(item)">
                </mat-progress-bar>
              </div>
            </div>
          </div>
        </div>

        <div class="score-actions" *ngIf="showActions">
          <button mat-raised-button color="primary" (click)="onRecalculate()">
            <mat-icon>refresh</mat-icon>
            Пересчитать
          </button>
          <button mat-button (click)="onViewHistory()" *ngIf="scoreDetails?.scoreHistory?.length">
            <mat-icon>history</mat-icon>
            История изменений
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styleUrls: ['./lead-score-details.component.scss']
})
export class LeadScoreDetailsComponent implements OnInit {
  @Input() scoreDetails?: LeadScoreDetails;
  @Input() expanded: boolean = false;
  @Input() showActions: boolean = true;

  scoreCriteriaGroups: ScoreCriteriaGroup[] = [
    {
      name: 'Демографические данные',
      icon: 'person',
      maxScore: 45,
      items: [
        { key: 'profileCompletion', label: 'Полнота профиля', maxPoints: 15 },
        { key: 'jobTitleMatch', label: 'Соответствие должности', maxPoints: 10 },
        { key: 'companySize', label: 'Размер компании', maxPoints: 10 },
        { key: 'industryMatch', label: 'Соответствие отрасли', maxPoints: 10 }
      ]
    },
    {
      name: 'Поведенческие критерии',
      icon: 'trending_up',
      maxScore: 45,
      items: [
        { key: 'websiteActivity', label: 'Активность на сайте', maxPoints: 15 },
        { key: 'emailEngagement', label: 'Взаимодействие с email', maxPoints: 10 },
        { key: 'formSubmissions', label: 'Заполнение форм', maxPoints: 10 },
        { key: 'contentDownloads', label: 'Скачивание контента', maxPoints: 10 }
      ]
    },
    {
      name: 'Взаимодействие',
      icon: 'chat',
      maxScore: 20,
      items: [
        { key: 'responseTime', label: 'Время отклика', maxPoints: 10 },
        { key: 'communicationFrequency', label: 'Частота общения', maxPoints: 5 },
        { key: 'meetingAttendance', label: 'Посещаемость встреч', maxPoints: 5 }
      ]
    },
    {
      name: 'Готовность к покупке',
      icon: 'shopping_cart',
      maxScore: 25,
      items: [
        { key: 'budgetConfirmed', label: 'Подтвержден бюджет', maxPoints: 10 },
        { key: 'decisionMaker', label: 'Лицо принимающее решения', maxPoints: 10 },
        { key: 'timeframeDefined', label: 'Определены временные рамки', maxPoints: 5 }
      ]
    }
  ];

  ngOnInit() {
    // Компонент готов к использованию
  }

  toggleExpanded() {
    this.expanded = !this.expanded;
  }

  getGroupScore(group: ScoreCriteriaGroup): number {
    if (!this.scoreDetails?.criteria) return 0;
    
    return group.items.reduce((total, item) => {
      return total + (this.scoreDetails?.criteria[item.key] || 0);
    }, 0);
  }

  getItemPercentage(item: any): number {
    if (!this.scoreDetails?.criteria) return 0;
    
    const score = this.scoreDetails.criteria[item.key] || 0;
    return (score / item.maxPoints) * 100;
  }

  getProgressColor(item: any): 'primary' | 'accent' | 'warn' {
    const percentage = this.getItemPercentage(item);
    if (percentage >= 80) return 'primary';
    if (percentage >= 50) return 'accent';
    return 'warn';
  }

  onRecalculate() {
    // Эмитируем событие для родительского компонента
    console.log('Recalculating score for lead:', this.scoreDetails?.leadId);
  }

  onViewHistory() {
    // Эмитируем событие для показа истории
    console.log('Viewing history for lead:', this.scoreDetails?.leadId);
  }
}