import { Injectable, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { CallScriptsService } from '../../shared/services/call-scripts.service';
import { SoftphoneLoggerService } from '../softphone-logger.service';
import { SoftphoneScript, mapCallScriptToSoftphoneScript } from '../types/softphone-script';
import { CallScriptTree } from '../../shared/interfaces/call-script.interface';

/**
 * Управляет загрузкой и отображением скриптов звонков
 */
@Injectable({
  providedIn: 'root',
})
export class CallScriptsManagerService {
  readonly scripts = signal<SoftphoneScript[]>([]);
  readonly showScripts = signal(false);
  readonly selectedScriptBranch = signal<string | null>(null);
  readonly callNote = signal<string>('');
  readonly callType = signal<string | null>(null);

  private scriptsLoading = false;

  private readonly callScripts = inject(CallScriptsService);
  private readonly logger = inject(SoftphoneLoggerService);

  /**
   * Загрузить активные скрипты с сервера
   */
  async loadScripts(): Promise<void> {
    if (this.scriptsLoading) return;
    this.scriptsLoading = true;
    
    try {
      this.logger.info('Requesting active call scripts (tree) from API');
      const list = await lastValueFrom<CallScriptTree[]>(
        this.callScripts.getCallScriptsTree(true)
      );
      const mapped = (list || []).map((s) => mapCallScriptToSoftphoneScript(s));
      this.logger.debug('Call scripts tree response received', { count: mapped.length });
      this.scripts.set(mapped);
    } catch (error) {
      this.logger.error('Failed to load call scripts tree', error);
      this.scripts.set([]);
    } finally {
      this.scriptsLoading = false;
    }
  }

  /**
   * Переключить видимость панели скриптов
   */
  toggleScriptsPanel(): void {
    const opening = !this.showScripts();
    this.showScripts.set(opening);
    if (opening) {
      this.loadScripts().catch((err) => 
        this.logger.warn('callScripts.getActiveCallScripts failed', err)
      );
    }
  }

  /**
   * Открыть панель скриптов
   */
  openScriptsPanel(): void {
    if (!this.showScripts()) {
      this.showScripts.set(true);
    }
    this.loadScripts().catch((err) => 
      this.logger.warn('callScripts.getActiveCallScripts failed', err)
    );
  }

  /**
   * Найти название скрипта по ID
   */
  findScriptTitle(id: string | null): string | null {
    if (!id) return null;
    const stack = [...this.scripts()];
    while (stack.length) {
      const script = stack.pop()!;
      if (script.id === id) return script.title;
      if (script.children) stack.push(...script.children);
    }
    return null;
  }

  /**
   * Сбросить состояние скриптов
   */
  resetState(): void {
    this.selectedScriptBranch.set(null);
    this.callNote.set('');
    this.callType.set(null);
  }
}
