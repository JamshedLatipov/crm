import { Injectable, OnDestroy, inject, computed } from '@angular/core';
import { SoftphoneService } from './softphone.service';
import { SoftphoneControllerService } from './softphone-controller.service';
import { SoftphoneMediaService } from './softphone-media.service';
import { SoftphoneLoggerService } from './softphone-logger.service';
import { TaskModalService } from '../tasks/services/task-modal.service';
import { CallStatusService } from './services/call-status.service';
import { CallScriptsManagerService } from './services/call-scripts-manager.service';
import { QueueStateService } from './services/queue-state.service';
import { SoftphoneEventHandlerService } from './services/softphone-event-handler.service';
import { cleanClipboardNumber, getSessionCallKey } from './softphone.helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsSIPSession = any;

/**
 * Facade для управления софтфоном: координирует работу специализированных сервисов
 */
@Injectable({
  providedIn: 'root',
})
export class SoftphoneControllerFacade implements OnDestroy {
  private readonly softphone = inject(SoftphoneService);
  private readonly controller = inject(SoftphoneControllerService);
  private readonly media = inject(SoftphoneMediaService);
  private readonly logger = inject(SoftphoneLoggerService);
  private readonly taskModal = inject(TaskModalService);
  
  private readonly callStatus = inject(CallStatusService);
  private readonly scriptsManager = inject(CallScriptsManagerService);
  private readonly queueState = inject(QueueStateService);
  private readonly eventHandler = inject(SoftphoneEventHandlerService);

  // Прокси к сигналам из специализированных сервисов
  readonly status = this.callStatus.status;
  readonly incoming = this.callStatus.incoming;
  readonly incomingFrom = this.callStatus.incomingFrom;
  readonly callActive = this.callStatus.callActive;
  readonly muted = this.callStatus.muted;
  readonly onHold = this.callStatus.onHold;
  readonly holdInProgress = this.callStatus.holdInProgress;
  readonly microphoneError = this.callStatus.microphoneError;
  readonly callDuration = this.callStatus.callDuration;
  readonly dtmfSequence = this.callStatus.dtmfSequence;
  readonly callee = this.callStatus.callee;
  readonly transferTarget = this.callStatus.transferTarget;

  readonly scripts = this.scriptsManager.scripts;
  readonly showScripts = this.scriptsManager.showScripts;
  readonly callNote = this.scriptsManager.callNote;
  readonly callType = this.scriptsManager.callType;
  readonly selectedScriptBranch = this.scriptsManager.selectedScriptBranch;

  readonly memberPaused = this.queueState.memberPaused;
  readonly memberReason = this.queueState.memberReason;

  // Computed сигнал для hasOperator
  readonly hasOperator = computed(() => this.callStatus.status() !== 'Softphone disabled');

  private autoConnectAttempted = false;

  initialize(config: { hasOperator: boolean; sipUser?: string; sipPassword?: string }) {
    const enabled = config.hasOperator;
    this.callStatus.status.set(enabled ? 'Disconnected' : 'Softphone disabled');
    
    if (!enabled) return;
    
    this.eventHandler.setupEventSubscription();
    this.scriptsManager.loadScripts().catch((err) => 
      this.logger.warn('Prefetch scripts failed', err)
    );
    
    if (config.sipUser && config.sipPassword) {
      this.maybeAutoConnect(config.sipUser, config.sipPassword);
    }
  }

  destroy() {
    this.eventHandler.destroy();
  }

  ngOnDestroy() {
    this.destroy();
  }

  connect(sipUser: string, sipPassword: string) {
    if (!sipUser || !sipPassword) {
      this.callStatus.status.set('Введите SIP логин и пароль');
      return;
    }
    
    this.ensureMicrophoneAccess().then((available) => {
      if (!available) return;
      this.callStatus.status.set('Connecting...');
      this.softphone.connect(sipUser, sipPassword);
    });
  }

  canAutoConnect(user: string, pass: string) {
    return Boolean(user && pass && !this.autoConnectAttempted);
  }

  private maybeAutoConnect(sipUser: string, sipPassword: string) {
    if (!this.canAutoConnect(sipUser, sipPassword)) return;
    this.autoConnectAttempted = true;
    
    setTimeout(() => {
      if (!this.softphone.isRegistered()) {
        this.connect(sipUser, sipPassword);
      }
    }, 50);
  }

  async updateMemberPause(ev: { paused: boolean; reason?: string }) {
    await this.queueState.updateMemberPause(ev);
  }

  answerIncoming() {
    const session = this.eventHandler.getCurrentSession();
    if (!session) return;
    
    try {
      this.controller.answer(session);
      this.callStatus.incoming.set(false);
      this.callStatus.status.set('Call answered');
    } catch (error) {
      this.logger.error('Answer failed', error);
      this.callStatus.status.set('Answer failed');
    }
  }

  rejectIncoming() {
    const session = this.eventHandler.getCurrentSession();
    if (!session) return;
    
    try {
      this.controller.reject(session);
      this.callStatus.incoming.set(false);
      this.callStatus.status.set('Call rejected');
    } catch (error) {
      this.logger.error('Reject failed', error);
      this.callStatus.status.set('Reject failed');
    }
  }

  call(asteriskHost: string) {
    if (!this.callee()) {
      this.callStatus.status.set('Введите номер абонента');
      return;
    }
    if (!this.softphone.isRegistered()) {
      this.callStatus.status.set('Сначала необходимо подключиться');
      return;
    }
    
    this.callStatus.status.set(`Calling ${this.callee()}...`);
    try {
      const opts = {
        extraHeaders: ['X-Custom-Header: CRM Call'],
        mediaConstraints: { audio: true, video: false },
        pcConfig: { iceServers: [], rtcpMuxPolicy: 'require' },
      };
      const session = this.controller.call(`sip:${this.callee()}@${asteriskHost}`, opts);
      this.callStatus.callActive.set(true);
      this.logger.info('Call session created (via controller):', session);
    } catch (error) {
      this.logger.error('Error initiating call (controller):', error);
      this.callStatus.status.set('Ошибка при совершении вызове');
    }
  }

  hangup() {
    this.controller.hangup();
  }

  async manualRegisterCall(payload?: { branchId?: string | null; note?: string; createTask?: boolean }) {
    try {
      const session = this.eventHandler.getCurrentSession();
      const callId = this.getSessionCallKey(session);
      const noteToSave = payload?.note ?? this.scriptsManager.callNote();
      const branch = payload?.branchId ?? this.scriptsManager.selectedScriptBranch();
      
      await this.controller.manualRegisterCall(callId, {
        note: noteToSave,
        callType: this.scriptsManager.callType(),
        scriptBranch: branch,
      });
      
      if (payload?.createTask) {
        const title = this.scriptsManager.findScriptTitle(branch) || 'Task from script';
        this.taskModal.openModal({ mode: 'create', title, note: noteToSave });
      }
    } catch (error) {
      this.logger.warn('manualRegisterCall failed', error);
    }
  }

  toggleMute() {
    if (!this.callActive()) return;
    const session = this.eventHandler.getCurrentSession();
    if (!session) return;
    
    try {
      const newMuted = this.media.toggleMute();
      this.callStatus.muted.set(newMuted);
      this.callStatus.status.set(newMuted ? 'Microphone muted' : 'Call in progress');
    } catch (error) {
      this.logger.error('Mute toggle failed', error);
    }
  }

  toggleHold() {
    if (!this.callActive()) return;
    const session = this.eventHandler.getCurrentSession();
    if (!session) return;
    if (this.callStatus.holdInProgress()) return;
    
    try {
      this.callStatus.holdInProgress.set(true);
      const goingToHold = !this.callStatus.onHold();
      
      if (goingToHold) {
        this.callStatus.status.set('Placing on hold...');
        this.softphone.hold();
      } else {
        this.callStatus.status.set('Resuming call...');
        this.softphone.unhold();
      }
    } catch (error) {
      this.logger.error('Hold toggle failed', error);
      this.callStatus.holdInProgress.set(false);
    }
  }

  transfer(type: 'blind' | 'attended' = 'blind') {
    if (!this.callActive()) {
      this.callStatus.status.set('No active call to transfer');
      return;
    }
    
    const target = this.callStatus.transferTarget();
    if (!target) {
      this.callStatus.status.set('Enter transfer target (e.g. SIP/1000)');
      return;
    }
    
    this.callStatus.status.set('Transferring...');
    this.controller.transfer(target, type).catch((error) => {
      this.logger.error('Transfer request failed', error);
      this.callStatus.status.set('Transfer request failed');
    });
  }

  toggleScriptsPanel() {
    this.scriptsManager.toggleScriptsPanel();
  }

  openScriptsPanel() {
    this.scriptsManager.openScriptsPanel();
  }

  pressKey(key: string) {
    if (!/[0-9*#]/.test(key)) return;
    
    if (this.callActive()) {
      try {
        this.controller.sendDTMF(key);
        this.callStatus.appendDtmf(key);
        this.callStatus.status.set(`DTMF: ${key}`);
      } catch (error) {
        this.logger.warn('DTMF send failed', error);
      }
      return;
    }
    
    this.callStatus.appendToCallee(key);
  }

  clearDtmf() {
    this.callStatus.clearDtmf();
  }

  clearNumber() {
    this.callStatus.clearCallee();
  }

  removeLast() {
    this.callStatus.removeLastFromCallee();
  }

  applyClipboardNumber(raw: string) {
    const cleaned = cleanClipboardNumber(raw);
    if (!cleaned) return;
    this.callStatus.callee.set(cleaned);
    this.callStatus.status.set(`Number pasted (${cleaned.length} digits)`);
  }

  private getSessionCallKey(session: JsSIPSession | null): string | null {
    return getSessionCallKey(session as any);
  }

  private async ensureMicrophoneAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.callStatus.microphoneError.set(false);
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      this.logger.error('Microphone access denied:', error);
      this.callStatus.microphoneError.set(true);
      this.callStatus.status.set('Для звонков необходим доступ к микрофону');
      return false;
    }
  }
}