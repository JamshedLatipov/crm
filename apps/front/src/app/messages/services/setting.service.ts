import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Setting,
  SettingCategory,
  CreateSettingDto,
  UpdateSettingDto,
  BulkUpdateSettingDto,
  TestSettingDto,
  TestSettingResponse,
} from '../models/setting.models';
import { environment } from '@crm/front/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SettingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBase + '/messages/settings';

  /**
   * Получить все настройки
   */
  findAll(): Observable<Setting[]> {
    return this.http.get<Setting[]>(this.apiUrl);
  }

  /**
   * Получить настройки по категории
   */
  findByCategory(category: SettingCategory): Observable<Setting[]> {
    return this.http.get<Setting[]>(`${this.apiUrl}/category/${category}`);
  }

  /**
   * Получить настройку по ключу
   */
  findByKey(key: string): Observable<Setting> {
    return this.http.get<Setting>(`${this.apiUrl}/key/${key}`);
  }

  /**
   * Создать настройку
   */
  create(dto: CreateSettingDto): Observable<Setting> {
    return this.http.post<Setting>(this.apiUrl, dto);
  }

  /**
   * Обновить настройку
   */
  update(key: string, dto: UpdateSettingDto): Observable<Setting> {
    return this.http.put<Setting>(`${this.apiUrl}/${key}`, dto);
  }

  /**
   * Массовое обновление настроек
   */
  bulkUpdate(updates: BulkUpdateSettingDto[]): Observable<Setting[]> {
    return this.http.put<Setting[]>(`${this.apiUrl}/bulk`, updates);
  }

  /**
   * Удалить настройку
   */
  delete(key: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${key}`);
  }

  /**
   * Инициализировать настройки по умолчанию
   */
  initializeDefaults(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/initialize-defaults`, {});
  }

  /**
   * Тестировать настройки канала
   */
  test(dto: TestSettingDto): Observable<TestSettingResponse> {
    return this.http.post<TestSettingResponse>(`${this.apiUrl}/test`, dto);
  }
}
