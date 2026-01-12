import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  Contact, 
  CreateContactDto, 
  UpdateContactDto, 
  ContactsStats, 
  ContactFilters,
  ContactType,
  ContactSource,
  ContactActivity,
  ActivityType,
  Deal,
  CreateDealDto
} from './contact.interfaces';

@Injectable({ providedIn: 'root' })
export class ContactsService {
  private readonly apiUrl = environment.apiBase + '/contacts';
  private readonly dealsApiUrl = environment.apiBase + '/deals';
  private readonly http = inject(HttpClient);

  // === Основные CRUD операции ===
  listContacts(filters?: ContactFilters, page = 1, limit = 50): Observable<{ data: Contact[], total: number }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    
    return this.http.get<{ data: Contact[], total: number }>(this.apiUrl, { params });
  }

  getContactById(id: string): Observable<Contact> {
    return this.http.get<Contact>(`${this.apiUrl}/${id}`);
  }

  createContact(dto: CreateContactDto): Observable<Contact> {
    return this.http.post<Contact>(this.apiUrl, dto);
  }

  updateContact(id: string, dto: UpdateContactDto): Observable<Contact> {
    return this.http.patch<Contact>(`${this.apiUrl}/${id}`, dto);
  }

  deleteContact(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // === Специальные запросы ===
  getRecentContacts(limit = 10): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.apiUrl}/recent`, {
      params: { limit: limit.toString() }
    });
  }

  getInactiveContacts(days = 30): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.apiUrl}/inactive`, {
      params: { days: days.toString() }
    });
  }

  searchContacts(query: string): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.apiUrl}/search`, {
      params: { q: query }
    });
  }

  getContactsStats(): Observable<ContactsStats> {
    return this.http.get<ContactsStats>(`${this.apiUrl}/stats`);
  }

  findDuplicates(): Observable<Contact[][]> {
    return this.http.get<Contact[][]>(`${this.apiUrl}/duplicates`);
  }

  // Универсальный поиск с фильтрами
  searchContactsWithFilters(filterState: {
    search?: string;
    isActive?: boolean | null;
    filters: Array<{
      fieldType: 'static' | 'custom';
      fieldName: string;
      operator: string;
      value?: any;
    }>;
    page?: number;
    pageSize?: number;
  }): Observable<{ data: Contact[], total: number }> {
    return this.http.post<{ data: Contact[], total: number }>(
      `${this.apiUrl}/advanced-search`, 
      filterState
    );
  }

  // === Специальные операции ===
  blacklistContact(id: string, reason: string): Observable<Contact> {
    return this.http.patch<Contact>(`${this.apiUrl}/${id}/blacklist`, { reason });
  }

  unblacklistContact(id: string): Observable<Contact> {
    return this.http.patch<Contact>(`${this.apiUrl}/${id}/unblacklist`, {});
  }

  assignContact(id: string, managerId: string): Observable<Contact> {
    return this.http.patch<Contact>(`${this.apiUrl}/${id}/assign`, { assignedTo: managerId });
  }

  updateLastContactDate(id: string): Observable<Contact> {
    return this.http.patch<Contact>(`${this.apiUrl}/${id}/touch`, {});
  }

  // === Активность ===
  getContactActivity(id: string, page?: number, pageSize?: number): Observable<{ items: ContactActivity[]; total: number }> {
    const params: Record<string, string> = {};
    if (page !== undefined) params['page'] = page.toString();
    if (pageSize !== undefined) params['pageSize'] = pageSize.toString();
    return this.http.get<{ items: ContactActivity[]; total: number }>(`${this.apiUrl}/${id}/activity`, { params });
  }

  addContactActivity(contactId: string, activity: {
    type: ActivityType;
    title: string;
    description?: string;
  }): Observable<ContactActivity> {
    return this.http.post<ContactActivity>(`${this.apiUrl}/${contactId}/activity`, activity);
  }

  // === Утилиты ===
  getContactTypeLabel(type: ContactType): string {
    const labels = {
      [ContactType.PERSON]: 'Физическое лицо',
      [ContactType.COMPANY]: 'Компания'
    };
    return labels[type] || type;
  }

  getContactSourceLabel(source: ContactSource): string {
    const labels = {
      [ContactSource.WEBSITE]: 'Сайт',
      [ContactSource.PHONE]: 'Телефон',
      [ContactSource.EMAIL]: 'Email',
      [ContactSource.REFERRAL]: 'Рекомендация',
      [ContactSource.SOCIAL_MEDIA]: 'Соцсети',
      [ContactSource.ADVERTISING]: 'Реклама',
      [ContactSource.IMPORT]: 'Импорт',
      [ContactSource.OTHER]: 'Другое'
    };
    return labels[source] || source;
  }

  formatContactName(contact: Contact | null): string {
    if (!contact) {
      return '';
    }
    
    if (contact.type === ContactType.COMPANY) {
      return contact.name;
    }
    
    if (contact.firstName || contact.lastName) {
      return [contact.firstName, contact.middleName, contact.lastName]
        .filter(Boolean)
        .join(' ');
    }
    
    return contact.name;
  }

  getContactDisplayInfo(contact: Contact): string {
    const parts = [];
    
    if (contact.position) {
      parts.push(contact.position);
    }
    
    if (contact.companyName || contact.company?.name) {
      parts.push(contact.company?.name || contact.companyName);
    }
    
    return parts.join(' в ');
  }

  getActivityIcon(type: ActivityType): string {
    const icons: Record<ActivityType, string> = {
      [ActivityType.CALL]: 'phone',
      [ActivityType.EMAIL]: 'email',
      [ActivityType.MEETING]: 'event',
      [ActivityType.NOTE]: 'note',
      [ActivityType.TASK]: 'task',
      [ActivityType.DEAL]: 'handshake',
      [ActivityType.SYSTEM]: 'settings'
    };
    
    return icons[type] || 'history';
  }

  getActivityTypeLabel(type: ActivityType): string {
    const labels: Record<ActivityType, string> = {
      [ActivityType.CALL]: 'Звонок',
      [ActivityType.EMAIL]: 'Email',
      [ActivityType.MEETING]: 'Встреча',
      [ActivityType.NOTE]: 'Заметка',
      [ActivityType.TASK]: 'Задача',
      [ActivityType.DEAL]: 'Сделка',
      [ActivityType.SYSTEM]: 'Системное'
    };
    
    return labels[type] || type;
  }

  // Deals methods
  getContactDeals(contactId: string): Observable<Deal[]> {
    const url = `${this.dealsApiUrl}/by-contact/${contactId}`;
    console.log('Requesting deals from:', url);
    return this.http.get<Deal[]>(url);
  }

  createDealForContact(contactId: string, dealData: CreateDealDto): Observable<Deal> {
    return this.http.post<Deal>(`${this.dealsApiUrl}`, {
      ...dealData,
      contactId
    });
  }
}
