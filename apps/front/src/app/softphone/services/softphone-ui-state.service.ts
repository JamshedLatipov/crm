import { Injectable, signal, effect, inject, Injector, runInInjectionContext } from '@angular/core';
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
  // Use the injector to lazily resolve the facade to avoid a constructor-time
  // circular dependency. The Injector itself is safe to inject eagerly.
  private readonly injector = inject(Injector);

  private getFacade(): SoftphoneControllerFacade {
    return this.injector.get(SoftphoneControllerFacade);
  }

  // UI состояние
  activeTab = signal<SoftphoneTab>('dial');
  expanded = signal(true);
  autoExpandOnIncoming = signal(true);
  missedCallCount = signal(0);

  constructor() {
    // Delay creating the effect until the next microtask so that the
    // SoftphoneControllerFacade can be constructed first. This prevents a
    // circular DI resolution where the facade -> event handler -> ui state ->
    // facade would attempt to instantiate synchronously.
    // Defer installation of the effect to the next microtask but ensure it
    // runs inside an Angular injection context. Creating the effect outside a
    // proper injection context will throw NG0203, so we wrap the effect with
    // runInInjectionContext using the previously injected Injector.
    Promise.resolve().then(() => {
      runInInjectionContext(this.injector, () => {
        effect(() => {
          const facade = this.getFacade();
          if (facade?.incoming && facade.incoming()) {
            this.activeTab.set('info');
            if (this.autoExpandOnIncoming() && !this.expanded()) {
              this.toggleExpand();
            }
          }
        });
      });
    });
  }

  /**
   * Выбор активной вкладки
   */
  selectTab(tab: SoftphoneTab) {
    this.activeTab.set(tab);

    // Синхронизируем состояние панели скриптов
    const facade = this.getFacade();
    if (tab === 'scenarios') {
      if (!facade.showScripts()) {
        facade.toggleScriptsPanel();
      }
    } else {
      facade.showScripts.set(false);
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
