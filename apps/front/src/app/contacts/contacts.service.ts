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
  ContactSource 
} from './contact.interfaces';

@Injectable({ providedIn: 'root' })
export class ContactsService {
  private readonly apiUrl = environment.apiBase + '/contacts';
  private readonly http = inject(HttpClient);

  // === Основные CRUD операции ===
  listContacts(filters?: ContactFilters): Observable<Contact[]> {
    let params = new HttpParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    
    return this.http.get<Contact[]>(this.apiUrl, { params });
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

  formatContactName(contact: Contact): string {
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
}
