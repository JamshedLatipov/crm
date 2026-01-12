import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { 
  Company, 
  CreateCompanyDto, 
  UpdateCompanyDto, 
  CompanyType, 
  CompanySize, 
  Industry 
} from '../pipeline/dtos';
import { environment } from '../../environments/environment';
import { CompaniesFilterState } from '../companies/companies-filter-state.interface';

export interface CompanyFilters {
  search?: string;
  type?: CompanyType;
  industry?: Industry;
  size?: CompanySize;
  city?: string;
  region?: string;
  country?: string;
  isActive?: boolean;
  isBlacklisted?: boolean;
  ownerId?: string;
  tags?: string[];
  minRevenue?: number;
  maxRevenue?: number;
  minEmployees?: number;
  maxEmployees?: number;
}

export interface CompanyStats {
  total: number;
  active: number;
  inactive: number;
  blacklisted: number;
  byType: Record<CompanyType, number>;
  byIndustry: Record<Industry, number>;
  bySize: Record<CompanySize, number>;
}

@Injectable({
  providedIn: 'root'
})
export class CompaniesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBase + '/companies';
  
  private companiesSubject = new BehaviorSubject<Company[]>([]);
  public companies$ = this.companiesSubject.asObservable();

  // Получить все компании с фильтрами
  getCompanies(filters: CompanyFilters = {}): Observable<Company[]> {
    let params = new HttpParams();
    
    // Добавляем параметры фильтрации
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params = params.append(key, v));
        } else {
          params = params.set(key, value.toString());
        }
      }
    });

    return this.http.get<Company[]>(this.apiUrl, { params }).pipe(
      tap(companies => this.companiesSubject.next(companies))
    );
  }

  // Получить компанию по ID
  getCompany(id: string): Observable<Company> {
    return this.http.get<Company>(`${this.apiUrl}/${id}`);
  }

  // Создать новую компанию
  createCompany(companyData: CreateCompanyDto): Observable<Company> {
    return this.http.post<Company>(this.apiUrl, companyData).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  // Обновить компанию
  updateCompany(id: string, updates: UpdateCompanyDto): Observable<Company> {
    return this.http.patch<Company>(`${this.apiUrl}/${id}`, updates).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  // Удалить компанию
  deleteCompany(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  // Поиск компаний
  searchCompanies(query: string): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/search`, {
      params: { q: query }
    });
  }

  // Получить неактивные компании
  getInactiveCompanies(days?: number): Observable<Company[]> {
    let params = new HttpParams();
    if (days) {
      params = params.set('days', days.toString());
    }
    
    return this.http.get<Company[]>(`${this.apiUrl}/inactive`, { params });
  }

  // Получить статистику компаний
  getCompanyStats(): Observable<CompanyStats> {
    return this.http.get<CompanyStats>(`${this.apiUrl}/stats`);
  }

  // Найти дубликаты
  findDuplicates(): Observable<{ name: string; companies: Company[] }[]> {
    return this.http.get<{ name: string; companies: Company[] }[]>(`${this.apiUrl}/duplicates`);
  }

  // Найти компании по ИНН
  findByInn(inn: string): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/by-inn/${inn}`);
  }

  // Получить компании по отрасли
  getCompaniesByIndustry(industry: Industry): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/by-industry/${industry}`);
  }

  // Получить компании по размеру
  getCompaniesBySize(size: CompanySize): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.apiUrl}/by-size/${size}`);
  }

  // Добавить в черный список
  addToBlacklist(id: string, reason: string): Observable<Company> {
    return this.http.patch<Company>(`${this.apiUrl}/${id}/blacklist`, { reason }).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  // Убрать из черного списка
  removeFromBlacklist(id: string): Observable<Company> {
    return this.http.patch<Company>(`${this.apiUrl}/${id}/unblacklist`, {}).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  // Назначить ответственного
  assignOwner(id: string, ownerId: string): Observable<Company> {
    return this.http.patch<Company>(`${this.apiUrl}/${id}/assign`, { ownerId }).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  // Обновить активность
  touchActivity(id: string): Observable<Company> {
    return this.http.patch<Company>(`${this.apiUrl}/${id}/touch`, {}).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  // Обновить рейтинг
  updateRating(id: string, rating: number): Observable<Company> {
    return this.http.patch<Company>(`${this.apiUrl}/${id}/rating`, { rating }).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  // Добавить теги
  addTags(id: string, tags: string[]): Observable<Company> {
    return this.http.post<Company>(`${this.apiUrl}/${id}/tags`, { tags }).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  // Удалить теги
  removeTags(id: string, tags: string[]): Observable<Company> {
    return this.http.delete<Company>(`${this.apiUrl}/${id}/tags`, { 
      body: { tags } 
    }).pipe(
      tap(() => this.refreshCompanies())
    );
  }

  // Обновить список компаний
  private refreshCompanies(): void {
    this.getCompanies().subscribe();
  }

  // Утилитарные методы
  getCompanyDisplayName(company: Company): string {
    return company.legalName || company.name;
  }

  getCompanyTypeLabel(type: CompanyType): string {
    const labels: Record<CompanyType, string> = {
      [CompanyType.CLIENT]: 'Клиент',
      [CompanyType.PROSPECT]: 'Потенциальный клиент',
      [CompanyType.PARTNER]: 'Партнер',
      [CompanyType.COMPETITOR]: 'Конкурент',
      [CompanyType.VENDOR]: 'Поставщик'
    };
    return labels[type] || type;
  }

  getCompanySizeLabel(size: CompanySize): string {
    const labels: Record<CompanySize, string> = {
      [CompanySize.STARTUP]: 'Стартап',
      [CompanySize.SMALL]: 'Малая (1-50 сотр.)',
      [CompanySize.MEDIUM]: 'Средняя (51-250 сотр.)',
      [CompanySize.LARGE]: 'Крупная (251-1000 сотр.)',
      [CompanySize.ENTERPRISE]: 'Корпорация (1000+ сотр.)'
    };
    return labels[size] || size;
  }

  getIndustryLabel(industry: Industry): string {
    const labels: Record<Industry, string> = {
      [Industry.TECHNOLOGY]: 'Технологии',
      [Industry.FINANCE]: 'Финансы',
      [Industry.HEALTHCARE]: 'Здравоохранение',
      [Industry.EDUCATION]: 'Образование',
      [Industry.RETAIL]: 'Розничная торговля',
      [Industry.MANUFACTURING]: 'Производство',
      [Industry.REAL_ESTATE]: 'Недвижимость',
      [Industry.CONSULTING]: 'Консалтинг',
      [Industry.MEDIA]: 'Медиа',
      [Industry.GOVERNMENT]: 'Государственный сектор',
      [Industry.OTHER]: 'Другое'
    };
    return labels[industry] || industry;
  }

  /**
   * Advanced search with universal filters
   */
  searchCompaniesAdvanced(
    filterState: CompaniesFilterState,
    page = 1,
    pageSize = 25
  ): Observable<{ data: Company[]; total: number }> {
    return this.http.post<{ data: Company[]; total: number }>(
      `${this.apiUrl}/search/advanced?page=${page}&pageSize=${pageSize}`,
      filterState
    );
  }
}
