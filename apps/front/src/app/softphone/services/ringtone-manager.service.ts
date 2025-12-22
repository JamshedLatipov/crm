import { Injectable, inject } from '@angular/core';
import { SoftphoneLoggerService } from '../softphone-logger.service';
import {
  RingtoneService,
  RINGBACK_DEFAULT_LEVEL,
  RINGBACK_INCOMING_LEVEL,
  RINGTONE_SRC,
  OUTGOING_RINGTONE_SRC,
  BUSY_RINGTONE_SRC,
} from '../ringtone.service';

/**
 * Централизованное управление воспроизведением рингтонов и звуковых уведомлений
 */
@Injectable({
  providedIn: 'root',
})
export class RingtoneManagerService {
  private readonly ringtone = inject(RingtoneService);
  private readonly logger = inject(SoftphoneLoggerService);

  /**
   * Запустить рингтон для входящего звонка
   */
  startIncomingRingtone(): void {
    try {
      this.ringtone.startRingback(RINGBACK_INCOMING_LEVEL, RINGTONE_SRC);
    } catch (error) {
      this.logger.warn('Failed to start incoming ringtone', error);
    }
  }

  /**
   * Запустить рингтон для исходящего звонка
   */
  startOutgoingRingtone(): void {
    try {
      this.ringtone.startRingback(RINGBACK_DEFAULT_LEVEL, OUTGOING_RINGTONE_SRC);
    } catch (error) {
      this.logger.warn('Failed to start outgoing ringtone', error);
    }
  }

  /**
   * Остановить воспроизведение рингтона
   */
  stopRingtone(): void {
    try {
      this.ringtone.stopRingback();
    } catch (error) {
      this.logger.warn('Failed to stop ringtone', error);
    }
  }

  /**
   * Воспроизвести звук "занято" (busy tone)
   */
  playBusyTone(): void {
    try {
      this.ringtone.playOneShot(BUSY_RINGTONE_SRC, 0.8, 1000);
    } catch (error) {
      this.logger.warn('Failed to play busy tone', error);
    }
  }
}
