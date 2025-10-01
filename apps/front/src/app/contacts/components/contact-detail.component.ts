import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ContactsService } from '../contacts.service';
import { Contact, ContactType, ContactSource, ContactActivity, ActivityType, Deal } from '../contact.interfaces';

@Component({
  selector: 'app-contact-detail',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <div class="page-container">
      <!-- Header with breadcrumbs -->
      <div class="page-header">
        <div class="header-content">
          <div class="breadcrumb">
            <a routerLink="/contacts" class="breadcrumb-link">Контакты</a>
            <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
            <span class="breadcrumb-current">{{ contact ? contactsService.formatContactName(contact) : 'Загрузка...' }}</span>
          </div>
          <div class="header-actions" *ngIf="contact && !loading">
            <button mat-button [matMenuTriggerFor]="actionsMenu">
              <mat-icon>more_vert</mat-icon>
              <span>Действия</span>
            </button>
            <mat-menu #actionsMenu="matMenu">
              <button mat-menu-item (click)="onEdit()">
                <mat-icon>edit</mat-icon>
                <span>Редактировать</span>
              </button>
              <button mat-menu-item (click)="updateLastContact()">
                <mat-icon>touch_app</mat-icon>
                <span>Отметить контакт</span>
              </button>
              <button mat-menu-item (click)="toggleBlacklist()" [class.text-red-600]="contact.isBlacklisted">
                <mat-icon>{{ contact.isBlacklisted ? 'person_add' : 'block' }}</mat-icon>
                <span>{{ contact.isBlacklisted ? 'Убрать из черного списка' : 'В черный список' }}</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="deleteContact()" class="text-red-600">
                <mat-icon>delete</mat-icon>
                <span>Удалить</span>
              </button>
            </mat-menu>
            <button mat-raised-button color="primary" (click)="onEdit()">
              <mat-icon>edit</mat-icon>
              <span>Редактировать</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Загрузка контакта...</p>
      </div>

      <!-- Main content -->
      <div *ngIf="!loading && contact" class="contact-detail-content">
        <!-- Contact Profile Card -->
        <div class="contact-profile-card">
          <div class="profile-header">
            <div class="profile-avatar">
              <div class="avatar-image" [ngStyle]="{'background-image': 'url(' + placeholderAvatar + ')'}">
                <mat-icon class="avatar-icon">{{ contact.type === 'company' ? 'business' : 'person' }}</mat-icon>
              </div>
            </div>
            <div class="profile-info">
              <h1 class="contact-name">{{ contact ? contactsService.formatContactName(contact) : 'Загрузка...' }}</h1>
              <p class="contact-title" *ngIf="contact && (contact.position || contact.companyName)">
                {{ contact.position }}{{ contact.position && contact.companyName ? ' в ' : '' }}{{ contact.companyName }}
              </p>
              <div class="contact-status-badges">
                <mat-chip-set>
                  <mat-chip [class]="getStatusChipClass()" [matTooltip]="getStatusTooltip()">
                    <mat-icon matChipAvatar>{{ getStatusIcon() }}</mat-icon>
                    {{ getStatusText() }}
                  </mat-chip>
                  <mat-chip color="accent" *ngIf="contact.source">
                    <mat-icon matChipAvatar>{{ getSourceIcon() }}</mat-icon>
                    {{ contactsService.getContactSourceLabel(contact.source) }}
                  </mat-chip>
                  <mat-chip *ngFor="let tag of contact.tags" class="bg-gray-100 text-gray-800">
                    {{ tag }}
                  </mat-chip>
                </mat-chip-set>
              </div>
            </div>
          </div>
        </div>

        <!-- Content tabs -->
        <mat-tab-group [(selectedIndex)]="selectedTabIndex" class="contact-tabs">
          <mat-tab label="Детали">
            <div class="tab-content">
              <div class="details-grid">
                <!-- Contact Information -->
                <div class="details-section">
                  <h3 class="section-title">Контактная информация</h3>
                  <div class="details-list">
                    <div class="detail-item" *ngIf="contact.email">
                      <mat-icon class="detail-icon">email</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Email</span>
                        <a [href]="'mailto:' + contact.email" class="detail-value link">{{ contact.email }}</a>
                      </div>
                    </div>
                    <div class="detail-item" *ngIf="contact.phone">
                      <mat-icon class="detail-icon">phone</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Телефон</span>
                        <a [href]="'tel:' + contact.phone" class="detail-value link">{{ contact.phone }}</a>
                      </div>
                    </div>
                    <div class="detail-item" *ngIf="contact.mobilePhone">
                      <mat-icon class="detail-icon">smartphone</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Мобильный</span>
                        <a [href]="'tel:' + contact.mobilePhone" class="detail-value link">{{ contact.mobilePhone }}</a>
                      </div>
                    </div>
                    <div class="detail-item" *ngIf="contact.workPhone">
                      <mat-icon class="detail-icon">business</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Рабочий телефон</span>
                        <a [href]="'tel:' + contact.workPhone" class="detail-value link">{{ contact.workPhone }}</a>
                      </div>
                    </div>
                    <div class="detail-item" *ngIf="contact.website">
                      <mat-icon class="detail-icon">language</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Веб-сайт</span>
                        <a [href]="contact.website" target="_blank" class="detail-value link">{{ contact.website }}</a>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Professional Information -->
                <div class="details-section">
                  <h3 class="section-title">Профессиональная информация</h3>
                  <div class="details-list">
                    <div class="detail-item" *ngIf="contact.position">
                      <mat-icon class="detail-icon">work</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Должность</span>
                        <span class="detail-value">{{ contact.position }}</span>
                      </div>
                    </div>
                    <div class="detail-item" *ngIf="contact.companyName">
                      <mat-icon class="detail-icon">business</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Компания</span>
                        <span class="detail-value">{{ contact.companyName }}</span>
                      </div>
                    </div>
                    <div class="detail-item" *ngIf="contact.source">
                      <mat-icon class="detail-icon">source</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Источник</span>
                        <span class="detail-value">{{ contactsService.getContactSourceLabel(contact.source) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Address Information -->
                <div class="details-section" *ngIf="hasAddressInfo()">
                  <h3 class="section-title">Адрес</h3>
                  <div class="details-list">
                    <div class="detail-item" *ngIf="contact.address?.country">
                      <mat-icon class="detail-icon">flag</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Страна</span>
                        <span class="detail-value">{{ contact.address?.country }}</span>
                      </div>
                    </div>
                    <div class="detail-item" *ngIf="contact.address?.city">
                      <mat-icon class="detail-icon">location_city</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Город</span>
                        <span class="detail-value">{{ contact.address?.city }}</span>
                      </div>
                    </div>
                    <div class="detail-item" *ngIf="getFullAddress()">
                      <mat-icon class="detail-icon">place</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Полный адрес</span>
                        <span class="detail-value">{{ getFullAddress() }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- System Information -->
                <div class="details-section">
                  <h3 class="section-title">Системная информация</h3>
                  <div class="details-list">
                    <div class="detail-item">
                      <mat-icon class="detail-icon">schedule</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Создан</span>
                        <span class="detail-value">{{ formatDate(contact.createdAt) }}</span>
                      </div>
                    </div>
                    <div class="detail-item">
                      <mat-icon class="detail-icon">update</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Обновлен</span>
                        <span class="detail-value">{{ formatDate(contact.updatedAt) }}</span>
                      </div>
                    </div>
                    <div class="detail-item" *ngIf="contact.lastContactDate">
                      <mat-icon class="detail-icon">record_voice_over</mat-icon>
                      <div class="detail-content">
                        <span class="detail-label">Последний контакт</span>
                        <span class="detail-value">{{ formatDate(contact.lastContactDate) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Активность">
            <div class="tab-content">
              <div class="activity-section">
                <div class="activity-header">
                  <h3 class="section-title">История активности</h3>
                </div>
                
                <div *ngIf="activitiesLoading" class="loading-container">
                  <mat-spinner diameter="30"></mat-spinner>
                  <p>Загрузка активности...</p>
                </div>

                <div *ngIf="!activitiesLoading && activities.length > 0" class="activity-list">
                  <div class="activity-item" *ngFor="let activity of activities; trackBy: trackActivityById">
                    <div class="activity-icon">
                      <mat-icon [class]="'activity-icon-' + activity.type">{{ getActivityIcon(activity.type) }}</mat-icon>
                    </div>
                    <div class="activity-content">
                      <div class="activity-title">{{ activity.title }}</div>
                      <div class="activity-description" *ngIf="activity.description">{{ activity.description }}</div>
                      <div class="activity-meta">
                        <span class="activity-type-badge">{{ contactsService.getActivityTypeLabel(activity.type) }}</span>
                        <span class="activity-date">{{ formatDate(activity.date) }}</span>
                        <span class="activity-user" *ngIf="activity.userName">{{ activity.userName }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div *ngIf="!activitiesLoading && activities.length === 0" class="empty-state">
                  <mat-icon class="empty-icon">history</mat-icon>
                  <h4>Нет записей об активности</h4>
                  <p>Добавьте первую запись о взаимодействии с контактом</p>
                </div>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Сделки">
            <div class="tab-content">
              <div class="deals-section">
                <h3 class="section-title">Связанные сделки</h3>
                
                <!-- Состояние загрузки -->
                <div *ngIf="dealsLoading" class="loading-section">
                  <mat-progress-spinner 
                    mode="indeterminate" 
                    diameter="40"
                    color="primary">
                  </mat-progress-spinner>
                  <p>Загрузка сделок...</p>
                </div>
                
                <!-- Список сделок -->
                <div class="deals-table" *ngIf="!dealsLoading && deals && deals.length > 0; else noDeals">
                  <div class="deal-item" *ngFor="let deal of deals">
                    <div class="deal-info">
                      <div class="deal-title">{{ deal.title }}</div>
                      <div class="deal-details">
                        <span class="deal-amount">{{ deal.amount | currency:(deal.currency || 'RUB'):'symbol':'1.0-0' }}</span>
                        <span class="deal-status" [class]="'status-' + deal.status?.toLowerCase()">{{ getDealStatusLabel(deal.status) }}</span>
                        <span class="deal-probability" *ngIf="deal.probability">{{ deal.probability }}% вероятность</span>
                      </div>
                      <div class="deal-meta">
                        <span class="deal-date">Создана: {{ deal.createdAt | date:'dd.MM.yyyy' }}</span>
                        <span class="deal-stage" *ngIf="deal.stage">{{ deal.stage }}</span>
                      </div>
                    </div>
                    <div class="deal-actions">
                      <button mat-icon-button matTooltip="Открыть сделку" (click)="openDeal(deal.id)">
                        <mat-icon>open_in_new</mat-icon>
                      </button>
                      <button mat-icon-button [matMenuTriggerFor]="dealMenu" matTooltip="Действия">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #dealMenu="matMenu">
                        <button mat-menu-item (click)="editDeal(deal)">
                          <mat-icon>edit</mat-icon>
                          <span>Редактировать</span>
                        </button>
                        <button mat-menu-item (click)="deleteDeal(deal.id)">
                          <mat-icon>delete</mat-icon>
                          <span>Удалить</span>
                        </button>
                      </mat-menu>
                    </div>
                  </div>
                </div>
                
                <ng-template #noDeals>
                  <div class="empty-state" *ngIf="!dealsLoading">
                    <mat-icon class="empty-icon">handshake</mat-icon>
                    <h4>Нет связанных сделок</h4>
                    <p>Сделки с этим контактом будут отображаться здесь</p>
                    <button mat-raised-button color="primary" (click)="createDeal()">
                      <mat-icon>add</mat-icon>
                      <span>Создать сделку</span>
                    </button>
                  </div>
                </ng-template>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>

      <!-- Error state -->
      <div *ngIf="!loading && !contact" class="error-state">
        <mat-icon class="error-icon">error_outline</mat-icon>
        <h3>Контакт не найден</h3>
        <p>Запрашиваемый контакт не существует или был удален</p>
        <button mat-raised-button routerLink="/contacts">
          <mat-icon>arrow_back</mat-icon>
          <span>Назад к контактам</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      min-height: 100vh;
      background-color: #f8fafc;
      padding: 1rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }

    .breadcrumb-link {
      color: #6b7280;
      text-decoration: none;
    }

    .breadcrumb-link:hover {
      color: #3b82f6;
    }

    .breadcrumb-separator {
      font-size: 1rem;
      color: #9ca3af;
    }

    .breadcrumb-current {
      font-weight: 500;
      color: #111827;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 4rem;
      color: #6b7280;
    }

    .contact-detail-content {
      max-width: 1200px;
      margin: 0 auto;
    }

    .contact-profile-card {
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
      overflow: hidden;
    }

    .profile-header {
      display: flex;
      gap: 1.5rem;
      padding: 2rem;
      align-items: flex-start;
    }

    .profile-avatar {
      flex-shrink: 0;
    }

    .avatar-image {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background-color: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      background-size: cover;
      background-position: center;
    }

    .avatar-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      color: #6b7280;
    }

    .profile-info {
      flex: 1;
      min-width: 0;
    }

    .contact-name {
      font-size: 2rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 0.5rem 0;
    }

    .contact-title {
      font-size: 1.125rem;
      color: #6b7280;
      margin: 0 0 1rem 0;
    }

    .contact-status-badges {
      margin-top: 1rem;
    }

    .quick-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .quick-actions a {
      text-decoration: none;
    }

    .contact-tabs {
      background: white;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .tab-content {
      padding: 2rem;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }

    .details-section {
      background: #f9fafb;
      border-radius: 0.5rem;
      padding: 1.5rem;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 1rem 0;
    }

    .details-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .detail-item {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .detail-icon {
      font-size: 1.25rem;
      color: #6b7280;
      margin-top: 0.125rem;
      flex-shrink: 0;
    }

    .detail-content {
      flex: 1;
      min-width: 0;
    }

    .detail-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
      margin-bottom: 0.25rem;
    }

    .detail-value {
      font-size: 0.875rem;
      color: #111827;
    }

    .detail-value.link {
      color: #3b82f6;
      text-decoration: none;
    }

    .detail-value.link:hover {
      text-decoration: underline;
    }

    .activity-section,
    .deals-section,
    .notes-section {
      
    }

    .activity-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .activity-item {
      display: flex;
      gap: 1rem;
      padding: 1.5rem;
      border-radius: 0.75rem;
      background: #f9fafb;
      border-left: 4px solid #e5e7eb;
      transition: all 0.2s ease;
    }

    .activity-item:hover {
      background: #f3f4f6;
      transform: translateY(-1px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .activity-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #6b7280;
    }

    .activity-icon-call {
      background: #dbeafe !important;
      color: #2563eb !important;
    }

    .activity-icon-email {
      background: #fef3c7 !important;
      color: #d97706 !important;
    }

    .activity-icon-meeting {
      background: #d1fae5 !important;
      color: #059669 !important;
    }

    .activity-icon-note {
      background: #e0e7ff !important;
      color: #7c3aed !important;
    }

    .activity-icon-task {
      background: #fce7f3 !important;
      color: #be185d !important;
    }

    .activity-icon-deal {
      background: #ecfdf5 !important;
      color: #059669 !important;
    }

    .activity-icon-system {
      background: #f3f4f6 !important;
      color: #6b7280 !important;
    }

    .activity-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-radius: 0.5rem;
      background: #f9fafb;
      margin-bottom: 1rem;
    }

    .activity-content {
      flex: 1;
      min-width: 0;
    }

    .activity-title {
      font-weight: 600;
      color: #111827;
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }

    .activity-description {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 0.75rem;
      line-height: 1.5;
    }

    .activity-meta {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .activity-type-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      background: #e5e7eb;
      color: #374151;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .activity-date {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .activity-user {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
    }

    .activity-user::before {
      content: "• ";
      margin-right: 0.25rem;
    }

    .deals-table {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .deal-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-radius: 0.5rem;
      background: #f9fafb;
      border-left: 4px solid #3b82f6;
    }

    .deal-info {
      flex: 1;
    }

    .deal-title {
      font-weight: 500;
      color: #111827;
      margin-bottom: 0.25rem;
    }

    .deal-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .deal-amount {
      font-size: 1.125rem;
      font-weight: 600;
      color: #059669;
    }

    .deal-status {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .deal-status.status-new {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .deal-status.status-in_progress {
      background: #fef3c7;
      color: #d97706;
    }

    .deal-status.status-negotiation {
      background: #fde68a;
      color: #b45309;
    }

    .deal-status.status-won {
      background: #d1fae5;
      color: #065f46;
    }

    .deal-status.status-lost {
      background: #fee2e2;
      color: #dc2626;
    }

    .deal-status.status-postponed {
      background: #e5e7eb;
      color: #374151;
    }

    .deal-probability {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 500;
    }

    .deal-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .deal-date {
      color: #6b7280;
    }

    .deal-stage {
      color: #374151;
      font-weight: 500;
    }

    .deal-actions {
      display: flex;
      gap: 0.5rem;
    }

    .notes-content {
      background: #f9fafb;
      border-radius: 0.5rem;
      padding: 1.5rem;
    }

    .notes-text {
      line-height: 1.6;
      color: #374151;
      white-space: pre-wrap;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #6b7280;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      padding: 3rem;
      color: #d1d5db;
    }

    .empty-state h4 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: #374151;
    }

    .empty-state p {
      margin: 0 0 1.5rem 0;
    }

    .error-state {
      text-align: center;
      padding: 4rem 1rem;
      color: #ef4444;
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      color: #fca5a5;
    }

    .error-state h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: #dc2626;
    }

    .error-state p {
      margin: 0 0 2rem 0;
      color: #6b7280;
    }

    .text-red-600 {
      color: #dc2626 !important;
    }

    .bg-red-100 {
      background-color: #fee2e2 !important;
    }

    .text-red-800 {
      color: #991b1b !important;
    }

    .bg-gray-100 {
      background-color: #f3f4f6 !important;
    }

    .text-gray-800 {
      color: #1f2937 !important;
    }

    .bg-green-100 {
      background-color: #dcfce7 !important;
    }

    .text-green-800 {
      color: #166534 !important;
    }

    @media (max-width: 768px) {
      .page-container {
        padding: 0.5rem;
      }

      .profile-header {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .header-content {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions {
        justify-content: center;
      }

      .details-grid {
        grid-template-columns: 1fr;
      }

      .contact-name {
        font-size: 1.5rem;
      }
    }
  `]
})
export class ContactDetailComponent implements OnInit {
  contact: Contact | null = null;
  loading = true;
  selectedTabIndex = 0;
  placeholderAvatar = 'https://via.placeholder.com/150';
  
  // Activity data
  activities: ContactActivity[] = [];
  activitiesLoading = false;
  
  // Deals data
  deals: Deal[] = [];
  dealsLoading = false;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  readonly contactsService = inject(ContactsService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }

    this.loadContact(id);
  }

  private loadContact(id: string): void {
    this.loading = true;
    this.contactsService.getContactById(id).subscribe({
      next: (contact) => { 
        this.contact = contact; 
        this.loading = false;
        this.loadActivity(id);
        this.loadDeals(id);
      },
      error: (error) => { 
        console.error('Error loading contact:', error);
        this.loading = false; 
        this.showError('Ошибка загрузки контакта');
      }
    });
  }

  private loadActivity(contactId: string): void {
    this.activitiesLoading = true;
    this.contactsService.getContactActivity(contactId).subscribe({
      next: (activities) => {
        this.activities = activities;
        this.activitiesLoading = false;
      },
      error: (error) => {
        console.error('Error loading activity:', error);
        this.activities = [];
        this.activitiesLoading = false;
      }
    });
  }

  private loadDeals(contactId: string): void {
    this.dealsLoading = true;
    console.log('Loading deals for contact:', contactId);
    this.contactsService.getContactDeals(contactId).subscribe({
      next: (deals) => {
        console.log('Deals loaded:', deals);
        this.deals = deals;
        this.dealsLoading = false;
      },
      error: (error) => {
        console.error('Error loading deals:', error);
        this.deals = [];
        this.dealsLoading = false;
      }
    });
  }

  // Status methods
  getStatusChipClass(): string {
    if (!this.contact) return '';
    
    if (this.contact.isBlacklisted) return 'bg-red-100 text-red-800';
    if (!this.contact.isActive) return 'bg-gray-100 text-gray-800';
    return 'bg-green-100 text-green-800';
  }

  getStatusTooltip(): string {
    if (!this.contact) return '';
    
    if (this.contact.isBlacklisted) return `В черном списке: ${this.contact.blacklistReason || 'Не указана причина'}`;
    if (!this.contact.isActive) return 'Неактивный контакт';
    return 'Активный контакт';
  }

  getStatusIcon(): string {
    if (!this.contact) return 'person';
    
    if (this.contact.isBlacklisted) return 'block';
    if (!this.contact.isActive) return 'pause_circle';
    return 'check_circle';
  }

  getStatusText(): string {
    if (!this.contact) return '';
    
    if (this.contact.isBlacklisted) return 'Заблокирован';
    if (!this.contact.isActive) return 'Неактивен';
    return 'Активен';
  }

  getSourceIcon(): string {
    if (!this.contact?.source) return 'help_outline';
    
    const icons: Record<ContactSource, string> = {
      [ContactSource.WEBSITE]: 'language',
      [ContactSource.PHONE]: 'phone',
      [ContactSource.EMAIL]: 'email',
      [ContactSource.REFERRAL]: 'person_add',
      [ContactSource.SOCIAL_MEDIA]: 'share',
      [ContactSource.ADVERTISING]: 'campaign',
      [ContactSource.IMPORT]: 'upload',
      [ContactSource.OTHER]: 'help_outline'
    };
    
    return icons[this.contact.source] || 'help_outline';
  }

  // Address methods
  hasAddressInfo(): boolean {
    if (!this.contact?.address) return false;
    
    return !!(
      this.contact.address.country ||
      this.contact.address.city ||
      this.contact.address.street ||
      this.contact.address.region
    );
  }

  getFullAddress(): string {
    if (!this.contact?.address) return '';
    
    const parts = [
      this.contact.address.street,
      this.contact.address.building,
      this.contact.address.apartment,
      this.contact.address.city,
      this.contact.address.region,
      this.contact.address.country,
      this.contact.address.postalCode
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  // Utility methods
  formatDate(dateString: string): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getActivityIcon(type: ActivityType): string {
    return this.contactsService.getActivityIcon(type);
  }

  trackActivityById(index: number, activity: ContactActivity): string {
    return activity.id;
  }

  openAddActivityDialog(): void {
    if (!this.contact) return;
    
    // TODO: Implement add activity dialog
    this.showInfo('Диалог добавления активности в разработке');
  }

  // Actions
  updateLastContact(): void {
    if (!this.contact) return;
    
    this.contactsService.updateLastContactDate(this.contact.id).subscribe({
      next: (updatedContact) => {
        this.contact = updatedContact;
        // Добавляем запись в активность
        this.contactsService.addContactActivity(this.contact.id, {
          type: ActivityType.SYSTEM,
          title: 'Отмечен контакт',
          description: 'Дата последнего контакта обновлена'
        }).subscribe({
          next: (activity) => {
            this.activities.unshift(activity); // Добавляем в начало списка
          },
          error: (error) => console.error('Error adding activity:', error)
        });
        this.showSuccess('Дата последнего контакта обновлена');
      },
      error: () => this.showError('Ошибка обновления даты контакта')
    });
  }

  toggleBlacklist(): void {
    if (!this.contact) return;
    
    if (this.contact.isBlacklisted) {
      this.contactsService.unblacklistContact(this.contact.id).subscribe({
        next: (updatedContact) => {
          this.contact = updatedContact;
          this.showSuccess('Контакт убран из черного списка');
        },
        error: () => this.showError('Ошибка снятия блокировки')
      });
    } else {
      const reason = prompt('Укажите причину добавления в черный список:');
      if (reason) {
        this.contactsService.blacklistContact(this.contact.id, reason).subscribe({
          next: (updatedContact) => {
            this.contact = updatedContact;
            this.showSuccess('Контакт добавлен в черный список');
          },
          error: () => this.showError('Ошибка добавления в черный список')
        });
      }
    }
  }

  deleteContact(): void {
    if (!this.contact) return;
    
    const confirmed = confirm(`Вы уверены, что хотите удалить контакт "${this.contactsService.formatContactName(this.contact)}"?`);
    if (confirmed) {
      this.contactsService.deleteContact(this.contact.id).subscribe({
        next: () => {
          this.showSuccess('Контакт удален');
          this.goBack();
        },
        error: () => this.showError('Ошибка удаления контакта')
      });
    }
  }

  onEdit(): void {
    if (!this.contact) return;
    
    import('./edit-contact-dialog.component').then((m) => {
      const dialogRef = this.dialog.open(m.EditContactDialogComponent, {
        width: '700px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data: { contact: this.contact }
      });

      dialogRef.afterClosed().subscribe((updatedContact) => {
        if (updatedContact) {
          this.contact = updatedContact;
          this.showSuccess('Контакт успешно обновлен');
        }
      });
    });
  }

  goBack(): void { 
    this.router.navigate(['/contacts']); 
  }

  // Notification helpers
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Закрыть', { duration: 3000, panelClass: 'success-snackbar' });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Закрыть', { duration: 5000, panelClass: 'error-snackbar' });
  }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Закрыть', { duration: 3000 });
  }

  // Deals methods
  getDealStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      'new': 'Новая',
      'in_progress': 'В работе',
      'negotiation': 'Переговоры',
      'won': 'Выиграна',
      'lost': 'Проиграна',
      'postponed': 'Отложена'
    };
    return statusLabels[status] || status;
  }

  openDeal(dealId: string): void {
    this.router.navigate(['/deals', dealId]);
  }

  createDeal(): void {
    if (!this.contact) return;
    
    // Открываем диалог создания сделки или перенаправляем на страницу создания
    this.router.navigate(['/deals/new'], { 
      queryParams: { contactId: this.contact.id } 
    });
  }

  editDeal(deal: Deal): void {
    this.router.navigate(['/deals', deal.id, 'edit']);
  }

  deleteDeal(dealId: string): void {
    const confirmed = confirm('Вы уверены, что хотите удалить эту сделку?');
    if (confirmed) {
      // Здесь должен быть вызов API для удаления сделки
      // После удаления - перезагрузить список сделок
      this.loadDeals(this.contact!.id);
    }
  }
}
