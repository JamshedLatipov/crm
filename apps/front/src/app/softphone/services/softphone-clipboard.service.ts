import { Injectable, inject } from '@angular/core';
import { SoftphoneControllerFacade } from '../softphone-controller.facade';

/**
 * Сервис для обработки вставки номеров из буфера обмена
 */
@Injectable({
  providedIn: 'root',
})
export class SoftphoneClipboardService {
  private readonly facade = inject(SoftphoneControllerFacade);

  /**
   * Обработка события paste
   * Вставляет номер только если:
   * - нет активного звонка
   * - фокус не в поле ввода
   */
  handlePaste(event: ClipboardEvent): void {
    // Не обрабатываем во время звонка
    if (this.facade.callActive()) {
      return;
    }

    // Проверяем, не находится ли фокус в поле ввода
    const activeElement = document.activeElement as HTMLElement | null;
    const isInEditableField = !!(
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable)
    );

    // Получаем текст из буфера
    const text = event.clipboardData?.getData('text');
    
    // Если фокус в поле или нет текста - не обрабатываем
    if (isInEditableField || !text) {
      return;
    }

    // Предотвращаем стандартное поведение и применяем номер
    event.preventDefault();
    this.facade.applyClipboardNumber(text);
  }
}
