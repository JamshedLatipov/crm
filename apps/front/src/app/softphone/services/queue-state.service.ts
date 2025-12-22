import { Injectable, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { QueueMembersService, QueueMemberRecord } from '../../contact-center/services/queue-members.service';
import { SoftphoneLoggerService } from '../softphone-logger.service';

/**
 * Управляет состоянием участника очереди (паузы, причины)
 */
@Injectable({
  providedIn: 'root',
})
export class QueueStateService {
  readonly memberPaused = signal(false);
  readonly memberReason = signal('');

  private queueMemberState: QueueMemberRecord | null = null;

  private readonly queueMembers = inject(QueueMembersService);
  private readonly logger = inject(SoftphoneLoggerService);

  /**
   * Загрузить текущее состояние участника очереди
   */
  async loadMemberState(): Promise<void> {
    try {
      const state = await lastValueFrom<QueueMemberRecord>(
        this.queueMembers.myState()
      );
      this.queueMemberState = state;
      this.memberPaused.set(Boolean(state?.paused));
      this.memberReason.set(state?.reason_paused || '');
    } catch (error) {
      this.logger.warn('Failed to load queue member state', error);
    }
  }

  /**
   * Обновить состояние паузы участника очереди
   */
  async updateMemberPause(ev: { paused: boolean; reason?: string }): Promise<void> {
    try {
      const paused = await lastValueFrom<QueueMemberRecord>(
        this.queueMembers.pause({ paused: ev.paused, reason_paused: ev.reason })
      );
      this.queueMemberState = paused;
      this.memberPaused.set(Boolean(paused?.paused));
      this.memberReason.set(paused?.reason_paused || '');
    } catch (error) {
      this.logger.error('Failed to update queue member pause state', error);
      // Откатываем к предыдущему состоянию в случае ошибки
      this.memberPaused.set(Boolean(this.queueMemberState?.paused));
      this.memberReason.set(this.queueMemberState?.reason_paused || '');
    }
  }
}
