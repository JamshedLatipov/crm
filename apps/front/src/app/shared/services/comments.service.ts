import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentFilters,
  CommentEntityType,
  PaginatedComments
} from '../interfaces/comment.interface';

@Injectable({
  providedIn: 'root'
})
export class CommentsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBase}/comments`;

  /**
   * Создать новый комментарий
   */
  createComment(request: CreateCommentRequest): Observable<Comment> {
    return this.http.post<Comment>(this.apiUrl, request);
  }

  /**
   * Получить комментарии с фильтрацией
   */
  getComments(filters: CommentFilters = {}): Observable<PaginatedComments> {
    let params = new HttpParams();
    
    if (filters.entityType) {
      params = params.set('entityType', filters.entityType);
    }
    if (filters.entityId) {
      params = params.set('entityId', filters.entityId);
    }
    if (filters.userId) {
      params = params.set('userId', filters.userId);
    }
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<PaginatedComments>(this.apiUrl, { params });
  }

  /**
   * Получить комментарии для конкретной сущности
   */
  getCommentsForEntity(
    entityType: CommentEntityType,
    entityId: string,
    page = 1,
    limit = 20
  ): Observable<PaginatedComments> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<PaginatedComments>(
      `${this.apiUrl}/entity/${entityType}/${entityId}`,
      { params }
    );
  }

  /**
   * Получить количество комментариев для сущности
   */
  getCommentsCount(
    entityType: CommentEntityType,
    entityId: string
  ): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(
      `${this.apiUrl}/entity/${entityType}/${entityId}/count`
    );
  }

  /**
   * Получить комментарий по ID
   */
  getCommentById(id: string): Observable<Comment> {
    return this.http.get<Comment>(`${this.apiUrl}/${id}`);
  }

  /**
   * Обновить комментарий
   */
  updateComment(id: string, request: UpdateCommentRequest): Observable<Comment> {
    return this.http.patch<Comment>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Удалить комментарий
   */
  deleteComment(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Поиск комментариев
   */
  searchComments(
    searchText: string,
    filters: CommentFilters = {}
  ): Observable<PaginatedComments> {
    let params = new HttpParams().set('q', searchText);
    
    if (filters.entityType) {
      params = params.set('entityType', filters.entityType);
    }
    if (filters.entityId) {
      params = params.set('entityId', filters.entityId);
    }
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<PaginatedComments>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Получить последние комментарии текущего пользователя
   */
  getUserRecentComments(limit = 10): Observable<Comment[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<Comment[]>(`${this.apiUrl}/user/recent`, { params });
  }
}