import { Injectable, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SoftphoneService, SoftphoneEvent } from '../softphone.service';
import { SoftphoneLoggerService } from '../softphone-logger.service';
import { SoftphoneAudioService } from '../softphone-audio.service';
import { SoftphoneMediaService } from '../softphone-media.service';
import { SoftphoneUiStateService } from './softphone-ui-state.service';
import { CallStatusService } from './call-status.service';
import { RingtoneManagerService } from './ringtone-manager.service';
import { QueueStateService } from './queue-state.service';

interface JsSIPSessionEvent {
  data?: {
    cause?: string;
    originator?: string;
    response?: unknown;
  };
  session?: unknown;
  originator?: string;
  request?: unknown;
  response?: unknown;
}

interface JsSIPRegisterEvent {
  cause?: string;
  response?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsSIPSession = any;

/**
 * Обработчик событий от JsSIP: регистрация, входящие/исходящие звонки, hold/unhold и т.д.
 */
@Injectable({
  providedIn: 'root',
})
export class SoftphoneEventHandlerService {
  private currentSession: JsSIPSession | null = null;
  private readonly destroy$ = new Subject<void>();
  private eventsInitialized = false;

  private readonly softphone = inject(SoftphoneService);
  private readonly logger = inject(SoftphoneLoggerService);
  private readonly audioSvc = inject(SoftphoneAudioService);
  private readonly media = inject(SoftphoneMediaService);
  private readonly uiState = inject(SoftphoneUiStateService);
  private readonly callStatus = inject(CallStatusService);
  private readonly ringtoneManager = inject(RingtoneManagerService);
  private readonly queueState = inject(QueueStateService);

  /**
   * Подписаться на события софтфона
   */
  setupEventSubscription(): void {
    if (this.eventsInitialized) return;
    this.eventsInitialized = true;
    
    this.softphone.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => this.handleEvent(event));
  }

  /**
   * Получить текущую сессию
   */
  getCurrentSession(): JsSIPSession | null {
    return this.currentSession;
  }

  /**
   * Уничтожить обработчик
   */
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private handleEvent(event: SoftphoneEvent): void {
    switch (event.type) {
      case 'registered':
        this.handleRegistered();
        break;
      case 'registrationFailed':
        this.handleRegistrationFailed(event.payload as JsSIPRegisterEvent);
        break;
      case 'connecting':
        this.callStatus.status.set('Connecting...');
        break;
      case 'connected':
        this.callStatus.status.set('Connected, registering...');
        break;
      case 'disconnected':
        this.callStatus.status.set('Disconnected');
        break;
      case 'progress':
        this.handleCallProgress(event.payload as JsSIPSessionEvent);
        break;
      case 'confirmed':
      case 'accepted':
        this.handleCallConfirmed(event.payload as JsSIPSessionEvent);
        break;
      case 'ended':
        this.handleCallEnded(event.payload as JsSIPSessionEvent);
        break;
      case 'failed':
        this.handleCallFailed(event.payload as JsSIPSessionEvent);
        break;
      case 'transferResult':
        this.handleTransferResult(event.payload as { ok?: boolean; error?: string });
        break;
      case 'transferFailed':
        this.callStatus.status.set('Transfer failed');
        break;
      case 'hold':
        this.handleHold();
        break;
      case 'unhold':
        this.handleUnhold();
        break;
      case 'newRTCSession':
        this.handleNewSession(event.payload as any);
        break;
      case 'track':
        this.audioSvc.attachTrackEvent((event.payload ?? event) as unknown);
        break;
    }
  }

  private handleRegistered(): void {
    this.callStatus.status.set('Вход выполнен!');
    this.queueState.loadMemberState();
  }

  private handleRegistrationFailed(event: JsSIPRegisterEvent): void {
    this.logger.error('Registration failed:', event);
    this.callStatus.status.set('Registration failed: ' + event.cause);
    this.ringtoneManager.stopRingtone();
    if (event.response) {
      this.logger.error('SIP response:', event.response);
    }
  }

  private handleCallProgress(event: JsSIPSessionEvent): void {
    this.logger.info('Call is in progress', event);
    this.callStatus.status.set('Ringing...');
    
    if (this.callStatus.incoming()) {
      this.ringtoneManager.startIncomingRingtone();
    } else {
      this.ringtoneManager.startOutgoingRingtone();
    }
  }

  private handleCallConfirmed(event: JsSIPSessionEvent): void {
    this.logger.info('Call confirmed', event);
    this.callStatus.activateCall();
    this.ringtoneManager.stopRingtone();
    
    // Диагностика peer connection
    try {
      const pc: RTCPeerConnection | undefined = this.currentSession?.connection;
      if (pc) {
        const senders = pc.getSenders?.() ?? [];
        this.logger.debug(
          'PC senders:',
          senders.map((sender) => ({
            kind: sender.track?.kind,
            enabled: sender.track?.enabled,
            id: sender.track?.id,
            label: sender.track?.label,
          }))
        );
        const receivers = pc.getReceivers?.() ?? [];
        this.logger.debug(
          'PC receivers:',
          receivers.map((receiver) => ({
            kind: receiver.track?.kind,
            id: receiver.track?.id,
            label: receiver.track?.label,
          }))
        );
        this.audioSvc.logPCDiagnostics(pc);
      }
    } catch (error) {
      this.logger.warn('peer connection inspection failed', error);
    }
  }

  private handleCallEnded(event: JsSIPSessionEvent): void {
    this.logger.info('Call ended with cause:', event.data?.cause);
    const wasMissed = this.callStatus.incoming() && !this.callStatus.callActive();
    
    this.callStatus.resetCallState();
    this.ringtoneManager.stopRingtone();
    
    if (wasMissed) {
      this.uiState.incrementMissedCalls();
    }
    
    this.currentSession = null;
    
    const causeStr = event.data?.cause ? String(event.data?.cause) : '';
    if (causeStr.toLowerCase().includes('busy') || causeStr === '486') {
      this.ringtoneManager.playBusyTone();
    }
    
    this.callStatus.status.set(
      this.softphone.isRegistered()
        ? 'Registered!'
        : `Call ended: ${event.data?.cause || 'Normal clearing'}`
    );
  }

  private handleCallFailed(event: JsSIPSessionEvent): void {
    this.logger.info('Call failed with cause:', event);
    this.callStatus.resetCallState();
    this.ringtoneManager.stopRingtone();
    this.ringtoneManager.playBusyTone();
    
    this.currentSession = null;
    
    this.callStatus.status.set(
      this.softphone.isRegistered()
        ? 'Registered!'
        : `Call failed: ${event.data?.cause || 'Unknown reason'}`
    );
  }

  private handleTransferResult(payload: { ok?: boolean; error?: string | null }): void {
    this.callStatus.status.set(
      payload?.ok ? 'Transfer initiated' : 'Transfer result: ' + (payload?.error || 'unknown')
    );
  }

  private handleHold(): void {
    this.callStatus.onHold.set(true);
    this.callStatus.holdInProgress.set(false);
    this.callStatus.status.set('Call on hold');
    this.applyHoldState(true);
  }

  private handleUnhold(): void {
    this.callStatus.onHold.set(false);
    this.callStatus.holdInProgress.set(false);
    this.callStatus.status.set(
      this.callStatus.callActive()
        ? 'Call in progress'
        : this.softphone.isRegistered()
        ? 'Registered!'
        : 'Disconnected'
    );
    this.applyHoldState(false);
  }

  private handleNewSession(payload: any): void {
    const session = payload?.session as JsSIPSession;
    if (!session) return;
    
    this.currentSession = session;
    const direction = payload?.direction || session.direction || 'outgoing';
    
    if (direction === 'incoming' || direction === 'inbound') {
      const from =
        session?.remote_identity?.uri ||
        session?.remote_identity?.display_name ||
        payload?.from ||
        null;
      const fromStr = typeof from === 'string' ? from : from?.toString?.() ?? null;
      
      this.callStatus.setIncoming(fromStr);
      this.ringtoneManager.startIncomingRingtone();
      this.notifyIncoming(fromStr);
    }
    
    try {
      this.media.setSession(session);
    } catch (error) {
      this.logger.warn('media.setSession failed', error);
    }
  }

  private notifyIncoming(from: string | null): void {
    try {
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          new Notification('Incoming call', {
            body: from || 'Unknown caller',
            tag: 'softphone-incoming',
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') {
              new Notification('Incoming call', {
                body: from || 'Unknown caller',
                tag: 'softphone-incoming',
              });
            }
          });
        }
      }
    } catch (error) {
      this.logger.warn('Notification failed', error);
    }
  }

  private applyHoldState(hold: boolean): void {
    try {
      const newMuted = this.media.applyHoldState(hold);
      this.callStatus.muted.set(newMuted);
    } catch (error) {
      this.logger.warn('applyHoldState failed', error);
    }
  }
}
