import { Injectable, signal } from '@angular/core';
import { formatDurationFromStart } from '../softphone.helpers';

/**
 * Управляет состоянием активного звонка: статус, длительность, флаги
 */
@Injectable({
  providedIn: 'root',
})
export class CallStatusService {
  // Основной статус софтфона
  readonly status = signal('Disconnected');
  
  // Флаги состояния звонка
  readonly callActive = signal(false);
  readonly incoming = signal(false);
  readonly incomingFrom = signal<string | null>(null);
  
  // Состояния медиа
  readonly muted = signal(false);
  readonly onHold = signal(false);
  readonly holdInProgress = signal(false);
  
  // Длительность звонка
  readonly callDuration = signal('00:00');
  
  // Прочие флаги
  readonly microphoneError = signal(false);
  
  // DTMF и номер вызова
  readonly dtmfSequence = signal('');
  readonly callee = signal('');
  readonly transferTarget = signal('');
  
  private callStart: number | null = null;
  private durationTimer: number | null = null;

  /**
   * Начать отсчет времени звонка
   */
  startCallTimer() {
    this.callStart = Date.now();
    this.updateDuration();
    this.durationTimer = window.setInterval(() => this.updateDuration(), 1000);
  }

  /**
   * Остановить таймер звонка
   */
  stopCallTimer() {
    if (this.durationTimer !== null) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    this.callStart = null;
    this.callDuration.set('00:00');
  }

  /**
   * Обновить отображаемую длительность
   */
  private updateDuration() {
    if (!this.callStart) return;
    this.callDuration.set(formatDurationFromStart(this.callStart));
  }

  /**
   * Сбросить состояние звонка после завершения
   */
  resetCallState() {
    this.callActive.set(false);
    this.incoming.set(false);
    this.incomingFrom.set(null);
    this.onHold.set(false);
    this.holdInProgress.set(false);
    this.stopCallTimer();
  }

  /**
   * Установить входящий звонок
   */
  setIncoming(from: string | null) {
    this.incoming.set(true);
    this.incomingFrom.set(from);
    this.status.set(`Incoming call${from ? ' from ' + from : ''}`);
  }

  /**
   * Активировать звонок (подтвержден)
   */
  activateCall() {
    this.callActive.set(true);
    this.incoming.set(false);
    this.status.set('Call in progress');
    this.startCallTimer();
  }

  /**
   * Добавить символ DTMF
   */
  appendDtmf(key: string) {
    this.dtmfSequence.set((this.dtmfSequence() + key).slice(-32));
  }

  /**
   * Очистить последовательность DTMF
   */
  clearDtmf() {
    this.dtmfSequence.set('');
  }

  /**
   * Добавить символ к набираемому номеру
   */
  appendToCallee(key: string) {
    this.callee.set(this.callee() + key);
  }

  /**
   * Очистить набираемый номер
   */
  clearCallee() {
    this.callee.set('');
  }

  /**
   * Удалить последний символ из номера
   */
  removeLastFromCallee() {
    this.callee.set(this.callee().slice(0, -1));
  }
}
