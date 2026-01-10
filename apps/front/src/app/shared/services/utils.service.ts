import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FilterOptions, SortOptions } from '../types/common.types';
import { CurrencyService } from '../../services/currency.service';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {
  private currencyService = inject(CurrencyService);

  /**
   * Форматирует числа для отображения
   */
  formatNumber(value: number, decimals = 0): string {
    if (isNaN(value)) return '0';
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  /**
   * Форматирует валюту (используя динамические настройки)
   * @deprecated Используйте CurrencyFormatPipe вместо этого метода
   */
  formatCurrency(value: number, currency?: string): string {
    if (isNaN(value)) return `0 ${this.currencyService.getSymbol()}`;
    
    // Если передана конкретная валюта, используем Intl
    if (currency) {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: currency
      }).format(value);
    }
    
    // Иначе используем настройки из CurrencyService
    return this.currencyService.formatAmount(value);
  }

  /**
   * Форматирует дату
   */
  formatDate(date: Date | string, format: 'short' | 'medium' | 'long' = 'short'): string {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const options: Intl.DateTimeFormatOptions = {
      short: { day: '2-digit' as const, month: '2-digit' as const, year: 'numeric' as const },
      medium: { day: '2-digit' as const, month: 'short' as const, year: 'numeric' as const },
      long: { 
        day: '2-digit' as const, 
        month: 'long' as const, 
        year: 'numeric' as const, 
        hour: '2-digit' as const, 
        minute: '2-digit' as const 
      }
    }[format];

    return new Intl.DateTimeFormat('ru-RU', options).format(d);
  }

  /**
   * Форматирует относительное время (назад)
   */
  formatRelativeTime(date: Date | string): string {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} ${this.pluralize(diffDays, 'день', 'дня', 'дней')} назад`;
    } else if (diffHours > 0) {
      return `${diffHours} ${this.pluralize(diffHours, 'час', 'часа', 'часов')} назад`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} ${this.pluralize(diffMinutes, 'минуту', 'минуты', 'минут')} назад`;
    } else {
      return 'только что';
    }
  }

  /**
   * Склонение русских слов
   */
  pluralize(count: number, one: string, few: string, many: string): string {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod100 >= 11 && mod100 <= 19) {
      return many;
    }

    if (mod10 === 1) {
      return one;
    }

    if (mod10 >= 2 && mod10 <= 4) {
      return few;
    }

    return many;
  }

  /**
   * Сокращение длинного текста
   */
  truncateText(text: string, maxLength = 50): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Генерация инициалов из имени
   */
  getInitials(fullName: string): string {
    if (!fullName) return '';
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    
    return names
      .slice(0, 2)
      .map(name => name.charAt(0).toUpperCase())
      .join('');
  }

  /**
   * Генерация случайного цвета для аватара
   */
  getAvatarColor(text: string): string {
    const colors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];
    
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Валидация email
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Валидация телефона
   */
  isValidPhone(phone: string): boolean {
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
  }

  /**
   * Форматирование телефона
   */
  formatPhone(phone: string): string {
    if (!phone) return '';
    
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11 && cleaned.startsWith('7')) {
      return `+${cleaned.charAt(0)} (${cleaned.substr(1, 3)}) ${cleaned.substr(4, 3)}-${cleaned.substr(7, 2)}-${cleaned.substr(9, 2)}`;
    }
    
    if (cleaned.length === 10) {
      return `+7 (${cleaned.substr(0, 3)}) ${cleaned.substr(3, 3)}-${cleaned.substr(6, 2)}-${cleaned.substr(8, 2)}`;
    }
    
    return phone;
  }

  /**
   * Фильтрация массива по поисковому запросу
   */
  filterBySearch<T>(items: T[], searchQuery: string, searchFields: (keyof T)[]): T[] {
    if (!searchQuery || !searchQuery.trim()) {
      return items;
    }

    const query = searchQuery.toLowerCase().trim();
    
    return items.filter(item => {
      return searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        if (typeof value === 'number') {
          return value.toString().includes(query);
        }
        return false;
      });
    });
  }

  /**
   * Сортировка массива
   */
  sortArray<T>(items: T[], sortOptions: SortOptions): T[] {
    if (!sortOptions.field) {
      return items;
    }

    return [...items].sort((a, b) => {
      const aValue = this.getNestedProperty(a, sortOptions.field);
      const bValue = this.getNestedProperty(b, sortOptions.field);

      let result = 0;

      if (aValue < bValue) {
        result = -1;
      } else if (aValue > bValue) {
        result = 1;
      }

      return sortOptions.direction === 'desc' ? -result : result;
    });
  }

  /**
   * Получение вложенного свойства объекта
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Применение фильтров к массиву
   */
  applyFilters<T>(items: T[], filters: FilterOptions, searchFields: (keyof T)[]): T[] {
    let filtered = items;

    // Поиск
    if (filters.search) {
      filtered = this.filterBySearch(filtered, filters.search, searchFields);
    }

    // Другие фильтры
    if (filters.status) {
      filtered = filtered.filter(item => (item as any).status === filters.status);
    }

    if (filters.assignedTo) {
      filtered = filtered.filter(item => (item as any).assignedTo === filters.assignedTo);
    }

    if (filters.source) {
      filtered = filtered.filter(item => (item as any).source === filters.source);
    }

    if (filters.priority) {
      filtered = filtered.filter(item => (item as any).priority === filters.priority);
    }

    // Фильтрация по датам
    if (filters.dateFrom) {
      filtered = filtered.filter(item => {
        const itemDate = new Date((item as any).createdAt || (item as any).updatedAt);
        return itemDate >= filters.dateFrom!;
      });
    }

    if (filters.dateTo) {
      filtered = filtered.filter(item => {
        const itemDate = new Date((item as any).createdAt || (item as any).updatedAt);
        return itemDate <= filters.dateTo!;
      });
    }

    return filtered;
  }

  /**
   * Создание наблюдаемого объекта с задержкой
   */
  debounceObservable<T>(value: T, delay = 300): Observable<T> {
    return new Observable(observer => {
      const timeout = setTimeout(() => {
        observer.next(value);
        observer.complete();
      }, delay);

      return () => clearTimeout(timeout);
    });
  }

  /**
   * Копирование в буфер обмена
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text: ', err);
      return false;
    }
  }

  /**
   * Загрузка файла
   */
  downloadFile(data: Blob | string, filename: string, type = 'text/plain'): void {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Генерация случайного ID
   */
  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Глубокое клонирование объекта
   */
  deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const clonedObj = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }

    return obj;
  }
}