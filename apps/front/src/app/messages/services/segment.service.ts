import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Segment, CreateSegmentDto } from '../models/message.models';
import { PaginatedResponse } from '../../shared/types/common.types';
import { SegmentService as UniversalSegmentService } from '../../shared/services/segment.service';
import { 
  SegmentUsageType, 
  CreateSegmentDto as UniversalCreateSegmentDto,
  Segment as UniversalSegment 
} from '../../shared/models/segment.models';

/**
 * @deprecated Используйте UniversalSegmentService из shared/services/segment.service.ts
 * Этот сервис оставлен для обратной совместимости и является обёрткой над универсальным сервисом
 */
@Injectable({
  providedIn: 'root',
})
export class SegmentService {
  private readonly universalService = inject(UniversalSegmentService);

  // Прокси для signals из универсального сервиса
  get segments() {
    return this.universalService.segments;
  }

  get isLoading() {
    return this.universalService.isLoading;
  }

  get error() {
    return this.universalService.error;
  }

  /**
   * Получить все SMS сегменты с пагинацией
   */
  getAll(page = 1, limit = 20, isActive?: boolean): Observable<PaginatedResponse<Segment>> {
    return this.universalService.getAll({
      page,
      limit,
      usageType: SegmentUsageType.SMS,
      isActive
    }) as Observable<PaginatedResponse<Segment>>;
  }

  /**
   * Получить сегмент по ID
   */
  getById(id: string): Observable<Segment> {
    return this.universalService.getById(id) as Observable<Segment>;
  }

  /**
   * Создать SMS сегмент
   */
  create(dto: CreateSegmentDto): Observable<Segment> {
    const universalDto: UniversalCreateSegmentDto = {
      ...dto,
      usageType: SegmentUsageType.SMS
    };
    return this.universalService.create(universalDto) as Observable<Segment>;
  }

  /**
   * Обновить сегмент
   */
  update(id: string, dto: Partial<CreateSegmentDto>): Observable<Segment> {
    return this.universalService.update(id, dto) as Observable<Segment>;
  }

  /**
   * Удалить сегмент
   */
  delete(id: string): Observable<void> {
    return this.universalService.delete(id);
  }

  /**
   * Дублировать сегмент
   */
  duplicate(id: string): Observable<Segment> {
    return this.universalService.duplicate(id) as Observable<Segment>;
  }

  /**
   * Обновить счётчик контактов в сегменте
   */
  refreshContactCount(id: string): Observable<{ count: number }> {
    return this.universalService.recalculate(id).pipe(
      map(result => ({ count: result.contactsCount }))
    );
  }

  /**
   * Получить контакты сегмента с пагинацией
   */
  getContacts(id: string, page = 1, limit = 20): Observable<PaginatedResponse<any>> {
    return this.universalService.getContacts(id, page, limit);
  }

  /**
   * Экспорт контактов сегмента
   */
  exportContacts(id: string, format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    return this.universalService.exportContacts(id, format);
  }
}
