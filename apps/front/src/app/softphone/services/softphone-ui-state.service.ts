import { Injectable, signal, effect, inject } from '@angular/core';
import { SoftphoneControllerFacade } from '../softphone-controller.facade';

export type SoftphoneTab = 'dial' | 'history' | 'info' | 'scenarios';

/**
 * Сервис для управления UI состоянием софтфона:
 * - активная вкладка
 * - раскрытие/сворачивание панели
 * - счетчик пропущенных звонков
 * - автоматическое раскрытие при входящих
 */
@Injectable({
  providedIn: 'root',
})
export class SoftphoneUiStateService {
  private readonly facade = inject(SoftphoneControllerFacade);

  // UI состояние
  activeTab = signal<SoftphoneTab>('dial');
  expanded = signal(true);
  autoExpandOnIncoming = signal(true);
  missedCallCount = signal(0);

  constructor() {
    // При входящем звонке переключаем на вкладку info и раскрываем панель
    effect(() => {
      if (this.facade.incoming()) {
        this.activeTab.set('info');
        if (this.autoExpandOnIncoming() && !this.expanded()) {
          this.toggleExpand();
        }
      }
    });
  }

  /**
   * Выбор активной вкладки
   */
  selectTab(tab: SoftphoneTab) {
    this.activeTab.set(tab);
    
    // Синхронизируем состояние панели скриптов
    if (tab === 'scenarios') {
      if (!this.facade.showScripts()) {
        this.facade.toggleScriptsPanel();
      }
    } else {
      this.facade.showScripts.set(false);
    }
  }

  /**
   * Переключение раскрытия/сворачивания панели
   */
  toggleExpand() {
    this.expanded.update(v => !v);
    
    // При раскрытии сбрасываем счетчик пропущенных
    if (this.expanded()) {
      this.missedCallCount.set(0);
    }
  }

  /**
   * Увеличение счетчика пропущенных звонков
   */
  incrementMissedCalls() {
    this.missedCallCount.update(c => c + 1);
  }

  /**
   * Сброс счетчика пропущенных звонков
   */
  resetMissedCalls() {
    this.missedCallCount.set(0);
  }
}
