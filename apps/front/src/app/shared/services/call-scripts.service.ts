import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CallScript,
  CallScriptCategory,
  CallScriptTree,
  CreateCallScriptRequest,
  UpdateCallScriptRequest,
  CallScriptFilters
} from '../interfaces/call-script.interface';

@Injectable({
  providedIn: 'root',
})
export class CallScriptsService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiBase + '/call-scripts';

  /**
   * Получить все скрипты звонков
   */
  getCallScripts(filters?: CallScriptFilters): Observable<CallScript[]> {
    let params = new HttpParams();

    if (filters?.categoryId) {
      params = params.set('category', filters.categoryId);
    }
    if (filters?.active !== undefined) {
      params = params.set('active', filters.active.toString());
    }
    if (filters?.tree) {
      params = params.set('tree', 'true');
    }

    return this.http.get<CallScript[]>(this.apiUrl, { params });
  }

  /**
   * Получить дерево скриптов звонков
   */
  getCallScriptsTree(activeOnly = true): Observable<CallScriptTree[]> {
    let params = new HttpParams()
      .set('tree', 'true');

    if (activeOnly) {
      params = params.set('active', 'true');
    }

    return this.http.get<CallScriptTree[]>(this.apiUrl, { params });
  }

  /**
   * Получить корневые скрипты
   */
  getRootCallScripts(): Observable<CallScript[]> {
    return this.http.get<CallScript[]>(`${this.apiUrl}/roots`);
  }

  /**
   * Получить скрипт по ID
   */
  getCallScriptById(id: string, includeChildren = false): Observable<CallScript> {
    const params = includeChildren ? new HttpParams().set('children', 'true') : new HttpParams();
    return this.http.get<CallScript>(`${this.apiUrl}/${id}`, { params });
  }

  /**
   * Получить потомков скрипта
   */
  getCallScriptDescendants(id: string): Observable<CallScript[]> {
    return this.http.get<CallScript[]>(`${this.apiUrl}/${id}/descendants`);
  }

  /**
   * Создать новый скрипт
   */
  createCallScript(request: CreateCallScriptRequest): Observable<CallScript> {
    return this.http.post<CallScript>(this.apiUrl, request);
  }

  /**
   * Обновить скрипт
   */
  updateCallScript(id: string, request: UpdateCallScriptRequest): Observable<CallScript> {
    return this.http.patch<CallScript>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Удалить скрипт
   */
  deleteCallScript(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Получить скрипты по категории
   */
  getCallScriptsByCategory(categoryId: string): Observable<CallScript[]> {
    const params = new HttpParams().set('category', categoryId);
    return this.http.get<CallScript[]>(this.apiUrl, { params });
  }

  /**
   * Получить активные скрипты
   */
  getActiveCallScripts(): Observable<CallScript[]> {
    const params = new HttpParams().set('active', 'true');
    return this.http.get<CallScript[]>(this.apiUrl, { params });
  }
}