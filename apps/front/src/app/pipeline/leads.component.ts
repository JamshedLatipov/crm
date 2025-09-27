import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeadsService } from './leads.service';
import { Lead, LeadStatus, LeadSource, CreateLeadDto } from './dtos';

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="leads-container">
      <div class="leads-header">
        <h2>Управление лидами</h2>
        <div class="leads-actions">
          <button class="btn-primary" (click)="showCreateForm = true">Создать лид</button>
          <button class="btn-secondary" (click)="loadLeads()">Обновить</button>
        </div>
      </div>

      <!-- Фильтры -->
      <div class="leads-filters">
        <select [(ngModel)]="selectedStatus" (ngModelChange)="filterLeads()">
          <option value="">Все статусы</option>
          <option value="new">Новые</option>
          <option value="qualified">Квалифицированные</option>
          <option value="unqualified">Неквалифицированные</option>
          <option value="converted">Конвертированные</option>
          <option value="lost">Потерянные</option>
        </select>

        <input 
          type="text" 
          placeholder="Поиск лидов..." 
          [(ngModel)]="searchQuery"
          (ngModelChange)="searchLeads()"
        />
      </div>

      <!-- Форма создания лида -->
      <div class="create-form" *ngIf="showCreateForm">
        <h3>Создать новый лид</h3>
        <div class="form-grid">
          <input placeholder="Заголовок" [(ngModel)]="newLead.title" />
          <input placeholder="Имя контакта" [(ngModel)]="newLead.contact.name" />
          <input placeholder="Email" [(ngModel)]="newLead.contact.email" />
          <input placeholder="Телефон" [(ngModel)]="newLead.contact.phone" />
          <input placeholder="Компания" [(ngModel)]="newLead.contact.company" />
          
          <select [(ngModel)]="newLead.source">
            <option value="website">Веб-сайт</option>
            <option value="phone">Телефон</option>
            <option value="email">Email</option>
            <option value="referral">Рефералы</option>
            <option value="social_media">Соц. сети</option>
            <option value="advertising">Реклама</option>
            <option value="other">Другое</option>
          </select>

          <textarea placeholder="Заметки" [(ngModel)]="newLead.notes"></textarea>
        </div>
        
        <div class="form-actions">
          <button class="btn-primary" (click)="createLead()">Создать</button>
          <button class="btn-secondary" (click)="cancelCreate()">Отмена</button>
        </div>
      </div>

      <!-- Список лидов -->
      <div class="leads-list">
        <div class="lead-card" *ngFor="let lead of filteredLeads">
          <div class="lead-header">
            <h4>{{ lead.title }}</h4>
            <span class="lead-status" [class]="'status-' + lead.status">
              {{ getStatusLabel(lead.status) }}
            </span>
          </div>
          
          <div class="lead-contact">
            <strong>{{ lead.contact.name }}</strong>
            <div *ngIf="lead.contact.company">{{ lead.contact.company }}</div>
            <div *ngIf="lead.contact.email">{{ lead.contact.email }}</div>
            <div *ngIf="lead.contact.phone">{{ lead.contact.phone }}</div>
          </div>

          <div class="lead-meta">
            <span>Источник: {{ getSourceLabel(lead.source) }}</span>
            <span>Оценка: {{ lead.score || 0 }}/100</span>
            <span>Создан: {{ formatDate(lead.createdAt) }}</span>
          </div>

          <div class="lead-actions">
            <button 
              *ngIf="lead.status === 'new'" 
              class="btn-success"
              (click)="qualifyLead(lead.id)"
            >
              Квалифицировать
            </button>
            
            <button 
              *ngIf="lead.status === 'qualified'" 
              class="btn-primary"
              (click)="convertToDeal(lead.id)"
            >
              Создать сделку
            </button>
            
            <button 
              *ngIf="lead.status === 'new'" 
              class="btn-danger"
              (click)="rejectLead(lead.id)"
            >
              Отклонить
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .leads-container {
      padding: 1rem;
    }

    .leads-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .leads-actions {
      display: flex;
      gap: 0.5rem;
    }

    .leads-filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .create-form {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 1rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .leads-list {
      display: grid;
      gap: 1rem;
    }

    .lead-card {
      background: white;
      padding: 1rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .lead-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .lead-status {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
    }

    .status-new { background: #e3f2fd; color: #1976d2; }
    .status-qualified { background: #e8f5e8; color: #2e7d32; }
    .status-unqualified { background: #fce4ec; color: #c2185b; }
    .status-converted { background: #f3e5f5; color: #7b1fa2; }
    .status-lost { background: #ffebee; color: #d32f2f; }

    .lead-contact {
      margin-bottom: 0.5rem;
    }

    .lead-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
      color: #666;
      margin-bottom: 1rem;
    }

    .lead-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-primary { background: #1976d2; color: white; }
    .btn-secondary { background: #757575; color: white; }
    .btn-success { background: #2e7d32; color: white; }
    .btn-danger { background: #d32f2f; color: white; }

    button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  `]
})
export class LeadsComponent implements OnInit {
  private readonly leadsService = inject(LeadsService);

  leads: Lead[] = [];
  filteredLeads: Lead[] = [];
  selectedStatus = '';
  searchQuery = '';
  showCreateForm = false;

  newLead: CreateLeadDto = {
    title: '',
    contact: {
      name: '',
      email: '',
      phone: '',
      company: ''
    },
    source: LeadSource.WEBSITE,
    notes: ''
  };

  ngOnInit() {
    this.loadLeads();
  }

  loadLeads() {
    this.leadsService.listLeads().subscribe(leads => {
      this.leads = leads;
      this.filteredLeads = leads;
    });
  }

  filterLeads() {
    let filtered = this.leads;
    
    if (this.selectedStatus) {
      filtered = filtered.filter(lead => lead.status === this.selectedStatus);
    }
    
    this.filteredLeads = filtered;
  }

  searchLeads() {
    if (!this.searchQuery.trim()) {
      this.filterLeads();
      return;
    }

    this.leadsService.searchLeads(this.searchQuery).subscribe(leads => {
      this.filteredLeads = leads;
    });
  }

  createLead() {
    if (!this.newLead.title || !this.newLead.contact.name) {
      alert('Заполните обязательные поля');
      return;
    }

    this.leadsService.createLead(this.newLead).subscribe(() => {
      this.loadLeads();
      this.cancelCreate();
    });
  }

  cancelCreate() {
    this.showCreateForm = false;
    this.newLead = {
      title: '',
      contact: { name: '', email: '', phone: '', company: '' },
      source: LeadSource.WEBSITE,
      notes: ''
    };
  }

  qualifyLead(id: string) {
    const score = prompt('Оценка лида (0-100):');
    if (score && !isNaN(+score)) {
      this.leadsService.qualifyLead(id, +score).subscribe(() => {
        this.loadLeads();
      });
    }
  }

  rejectLead(id: string) {
    const reason = prompt('Причина отклонения:');
    if (reason) {
      this.leadsService.rejectLead(id, reason).subscribe(() => {
        this.loadLeads();
      });
    }
  }

  convertToDeal(id: string) {
    // Здесь должен открываться диалог создания сделки
    // Пока используем простой prompt
    const amount = prompt('Сумма сделки:');
    const closeDate = prompt('Ожидаемая дата закрытия (YYYY-MM-DD):');
    
    if (amount && closeDate) {
      this.leadsService.convertToDeal(id, {
        amount: +amount,
        currency: 'RUB',
        expectedCloseDate: new Date(closeDate),
        stageId: 'default-stage-id' // Должен быть выбран пользователем
      }).subscribe(() => {
        this.loadLeads();
        alert('Лид успешно конвертирован в сделку!');
      });
    }
  }

  getStatusLabel(status: LeadStatus): string {
    const labels = {
      [LeadStatus.NEW]: 'Новый',
      [LeadStatus.QUALIFIED]: 'Квалифицированный',
      [LeadStatus.UNQUALIFIED]: 'Неквалифицированный',
      [LeadStatus.CONVERTED]: 'Конвертированный',
      [LeadStatus.LOST]: 'Потерянный'
    };
    return labels[status] || status;
  }

  getSourceLabel(source: LeadSource): string {
    const labels = {
      [LeadSource.WEBSITE]: 'Веб-сайт',
      [LeadSource.PHONE]: 'Телефон',
      [LeadSource.EMAIL]: 'Email',
      [LeadSource.REFERRAL]: 'Рефералы',
      [LeadSource.SOCIAL_MEDIA]: 'Соц. сети',
      [LeadSource.ADVERTISING]: 'Реклама',
      [LeadSource.OTHER]: 'Другое'
    };
    return labels[source] || source;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('ru-RU');
  }
}
