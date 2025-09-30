import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { DealStatusComponent, DealStatus } from '../deal-status/deal-status.component';

@Component({
  selector: 'app-status-demo',
  standalone: true,
  imports: [CommonModule, MatCardModule, DealStatusComponent],
  template: `
    <div class="status-demo">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Компонент статусов сделок</mat-card-title>
          <mat-card-subtitle>Демонстрация различных вариантов отображения</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="demo-section">
            <h3>Основные статусы</h3>
            <div class="status-row">
              <app-deal-status status="open" size="medium"></app-deal-status>
              <app-deal-status status="won" size="medium"></app-deal-status>
              <app-deal-status status="lost" size="medium"></app-deal-status>
            </div>
          </div>

          <div class="demo-section">
            <h3>Размеры</h3>
            <div class="status-row">
              <div class="size-group">
                <label>Маленький</label>
                <app-deal-status status="open" size="small"></app-deal-status>
              </div>
              <div class="size-group">
                <label>Средний</label>
                <app-deal-status status="won" size="medium"></app-deal-status>
              </div>
              <div class="size-group">
                <label>Большой</label>
                <app-deal-status status="lost" size="large"></app-deal-status>
              </div>
            </div>
          </div>

          <div class="demo-section">
            <h3>С индикаторами</h3>
            <div class="status-row">
              <div class="indicator-group">
                <label>Просроченная сделка</label>
                <app-deal-status 
                  status="open" 
                  [showIndicators]="true"
                  [isOverdue]="true"
                  size="medium">
                </app-deal-status>
              </div>
              
              <div class="indicator-group">
                <label>Крупная сделка</label>
                <app-deal-status 
                  status="open" 
                  [showIndicators]="true"
                  [isHighValue]="true"
                  size="medium">
                </app-deal-status>
              </div>
              
              <div class="indicator-group">
                <label>Горячая сделка</label>
                <app-deal-status 
                  status="open" 
                  [showIndicators]="true"
                  [isHot]="true"
                  size="medium">
                </app-deal-status>
              </div>
              
              <div class="indicator-group">
                <label>Все индикаторы</label>
                <app-deal-status 
                  status="open" 
                  [showIndicators]="true"
                  [isOverdue]="true"
                  [isHighValue]="true"
                  [isHot]="true"
                  size="medium">
                </app-deal-status>
              </div>
            </div>
          </div>

          <div class="demo-section">
            <h3>Анимации</h3>
            <div class="status-row">
              <div class="animation-group">
                <label>Открытая сделка (пульсация)</label>
                <app-deal-status status="open" size="large"></app-deal-status>
              </div>
              
              <div class="animation-group">
                <label>Выигранная сделка (блики)</label>
                <app-deal-status status="won" size="large"></app-deal-status>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .status-demo {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .demo-section {
      margin-bottom: 32px;
      
      h3 {
        color: var(--primary-color);
        margin-bottom: 16px;
        font-size: 18px;
        font-weight: 600;
      }
    }

    .status-row {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: center;
    }

    .size-group,
    .indicator-group,
    .animation-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
      
      label {
        font-size: 12px;
        color: #666;
        font-weight: 500;
        text-align: center;
        margin-bottom: 8px;
      }
    }

    /* Темная тема */
    :host-context(.dark) {
      .size-group,
      .indicator-group,
      .animation-group {
        border-color: #424242;
        background: #303030;
        
        label {
          color: #bbb;
        }
      }
    }

    /* Мобильная адаптация */
    @media (max-width: 768px) {
      .status-row {
        flex-direction: column;
        align-items: stretch;
      }
      
      .size-group,
      .indicator-group,
      .animation-group {
        flex-direction: row;
        justify-content: space-between;
        
        label {
          margin-bottom: 0;
          text-align: left;
        }
      }
    }
  `]
})
export class StatusDemoComponent {}