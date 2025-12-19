import {
  Component,
  OnInit,
  HostListener,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { environment } from '../../environments/environment';
import { Subject, lastValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs';
import { CallsApiService } from '../calls/calls.service';
import { CallScriptsService } from '../shared/services/call-scripts.service';
import { SoftphoneService } from './softphone.service';
import { SoftphoneAudioService } from './softphone-audio.service';
import { SoftphoneLoggerService } from './softphone-logger.service';
import {
  RingtoneService,
  OUTGOING_RINGTONE_SRC,
  BUSY_RINGTONE_SRC,
  RINGTONE_SRC,
  RINGBACK_DEFAULT_LEVEL,
  RINGBACK_INCOMING_LEVEL,
  REMOTE_AUDIO_ELEMENT_ID,
} from './ringtone.service';
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel
import { CommonModule } from '@angular/common'; // Import CommonModule for *ngIf
import { MatIconModule } from '@angular/material/icon'; // Import MatIconModule for icons
import {
  SoftphoneStatusBarComponent,
  SoftphoneCallInfoComponent,
  SoftphoneCallActionsComponent,
  SoftphoneScriptsPanelComponent,
} from './components';
import { SoftphoneDialTabComponent } from './components/softphone-dial-tab.component';
import { SoftphoneInfoTabComponent } from './components/softphone-info-tab.component';
import { SoftphoneCallHistoryComponent } from './components/softphone-call-history/softphone-call-history.component';
import { CallHistoryItem } from './components/softphone-call-history/softphone-call-history.types';
import { SoftphoneCallHistoryService } from './components/softphone-call-history/softphone-call-history.service';
import { TaskModalService } from '../tasks/services/task-modal.service';
import {
  QueueMembersService,
  QueueMemberRecord,
} from '../contact-center/services/queue-members.service';

// Define custom interfaces to avoid 'any' types
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

// (JsSIP events use dynamic payloads)

// Типизация сессии динамическая — допускаем любые свойства, чтобы работать с JsSIP runtime API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsSIPSession = any;

// Ringtone constants and behavior are provided by RingtoneService

@Component({
  selector: 'app-softphone',
  templateUrl: './softphone.component.html',
  styleUrls: ['./softphone.component.scss'],
  imports: [
    FormsModule,
    CommonModule,
    MatIconModule,
    SoftphoneStatusBarComponent,
    SoftphoneCallInfoComponent,
    SoftphoneCallActionsComponent,
    SoftphoneScriptsPanelComponent,
    SoftphoneDialTabComponent,
    SoftphoneInfoTabComponent,
    SoftphoneCallHistoryComponent,
  ],
})
export class SoftphoneComponent implements OnInit, OnDestroy {
  status = signal('Disconnected');
  // Incoming call state
  incoming = signal(false);
  incomingFrom = signal<string | null>(null);
  callActive = signal(false);
  muted = signal(false);
  onHold = signal(false);
  holdInProgress = signal(false);
  microphoneError = signal(false);
  private currentSession: JsSIPSession | null = null;
  // Таймер звонка
  private callStart: number | null = null;
  callDuration = signal('00:00');
  private durationTimer: number | null = null;
  // Remember whether microphone was muted before placing on hold
  private preHoldMuted: boolean | null = null;

  // Ringback tone (WebAudio) while outgoing call is ringing
  // ringback state moved to RingtoneService

  sipUser = '';
  sipPassword = '';
  callee = '';

  // Simple stats placeholders (could be wired to backend later)
  callsProcessedToday = 12;
  callsInQueue = 42;
  // Sequence of DTMF sent during active call (for user feedback)
  dtmfSequence = '';
  // Transfer UI
  transferTarget = '';

  // Call history data
  callHistory = signal<CallHistoryItem[]>([]);
  // Call scripts UI
  scripts = signal<any[]>([]);
  showScripts = signal(false);
  // Per-call metadata to persist
  callNote = signal<string>('');
  callType = signal<string | null>(null);
  selectedScriptBranch = signal<string | null>(null);

  // Asterisk host is read from environment config (moved from hardcoded value)
  private readonly asteriskHost = environment.asteriskHost || '127.0.0.1';

  private autoConnectAttempted = false;
  // lifecycle destroy notifier
  private readonly destroy$ = new Subject<void>();

  // inject calls API and softphone service per repo preference
  private readonly callsApi = inject(CallsApiService);
  private readonly softphone = inject(SoftphoneService);
  private readonly callScripts = inject(CallScriptsService);
  private readonly ringtone = inject(RingtoneService);
  private readonly audioSvc = inject(SoftphoneAudioService);
  private readonly logger = inject(SoftphoneLoggerService);
  private readonly callHistoryService = inject(SoftphoneCallHistoryService);
  private readonly taskModal = inject(TaskModalService);
  private readonly queueMembersSvc = inject(QueueMembersService);

  constructor() {
    // Автоподстановка сохранённых SIP реквизитов оператора
    try {
      const savedUser = localStorage.getItem('operator.username');
      const savedPass = localStorage.getItem('operator.password');
      if (savedUser) this.sipUser = savedUser;
      if (savedPass) this.sipPassword = savedPass;
    } catch {
      /* ignore */
    }
  }
  // UI tab state
  activeTab: 'dial' | 'history' | 'info' | 'scenarios' = 'dial';
  // Expand/collapse softphone UI
  expanded = true;
  // Missed calls counter shown on minimized badge
  missedCallCount = 0;
  // Auto-expand softphone on incoming call
  autoExpandOnIncoming = true;

  // Current operator queue member record (if any)
  currentMember: QueueMemberRecord | null = null;
  memberPaused = signal(false);
  memberReason = signal('');

  ngOnInit() {
    try {
      const saved = localStorage.getItem('softphone.expanded');
      if (saved !== null) this.expanded = saved === '1';
      const savedAuto = localStorage.getItem('softphone.autoExpandOnIncoming');
      if (savedAuto !== null) this.autoExpandOnIncoming = savedAuto === '1';
      const savedMissed = localStorage.getItem('softphone.missedCount');
      if (savedMissed !== null) this.missedCallCount = Number(savedMissed) || 0;
    } catch {
      // ignore
    }

    // Subscribe to softphone events coming from the service
    this.softphone.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (ev) => {
        switch (ev.type) {
          case 'registered':
            this.status.set('Вход выполнен!');
            // Try to locate operator queue member record and sync pause state
            try {
              const status = await lastValueFrom(
                this.queueMembersSvc.myState()
              );
              if (status.paused) {
                this.memberPaused.set(true);
                this.memberReason.set(status.reason_paused || '');
              }
            } catch (e) {
              this.logger.warn('load queue member failed', e);
            }
            break;
          case 'registrationFailed':
            this.registrationFailed(ev.payload as JsSIPRegisterEvent);
            break;
          case 'connecting':
            this.status.set('Connecting...');
            break;
          case 'connected':
            this.status.set('Connected, registering...');
            break;
          case 'disconnected':
            this.status.set('Disconnected');
            break;
          case 'progress':
            this.handleCallProgress(ev.payload as JsSIPSessionEvent);
            break;
          case 'confirmed':
          case 'accepted':
            this.handleCallConfirmed(ev.payload as JsSIPSessionEvent);
            break;
          case 'ended':
            this.handleCallEnded(ev.payload as JsSIPSessionEvent);
            break;
          case 'failed':
            this.handleCallFailed(ev.payload as JsSIPSessionEvent);
            break;
          case 'transferResult':
            this.status.set(
              ev.payload?.ok
                ? 'Transfer initiated'
                : 'Transfer result: ' + (ev.payload?.error || 'unknown')
            );
            break;
          case 'transferFailed':
            this.status.set('Transfer failed');
            break;
          case 'hold':
            // Session confirmed placed on hold (remote or local)
            this.onHold.set(true);
            this.holdInProgress.set(false);
            this.status.set('Call on hold');
            try {
              this.applyHoldState(true);
            } catch (e) {
              this.logger.warn('applyHoldState on hold failed', e);
            }
            break;
          case 'unhold':
            // Session resumed from hold
            this.onHold.set(false);
            this.holdInProgress.set(false);
            this.status.set(
              this.callActive()
                ? 'Call in progress'
                : this.isRegistered()
                ? 'Registered!'
                : 'Disconnected'
            );
            try {
              this.applyHoldState(false);
            } catch (e) {
              this.logger.warn('applyHoldState on unhold failed', e);
            }
            break;
            break;
          case 'newRTCSession': {
            const sess = ev.payload?.session as JsSIPSession;
            this.currentSession = sess;

            // determine direction
            const dir =
              (ev.payload && ev.payload.direction) ||
              (sess && sess.direction) ||
              'outgoing';

            if (dir === 'incoming' || dir === 'inbound') {
              this.incoming.set(true);
              this.activeTab = 'info';

              // try to extract caller display or remote identity
              const from =
                (sess &&
                  (sess.remote_identity?.uri ||
                    sess.remote_identity?.display_name)) ||
                (ev.payload && ev.payload.from) ||
                null;
              this.incomingFrom.set(
                typeof from === 'string' ? from : from?.toString?.() ?? null
              );
              this.status.set(
                `Incoming call${
                  this.incomingFrom() ? ' from ' + this.incomingFrom() : ''
                }`
              );
              this.logger.info('Incoming call from:', this.incomingFrom());

              // Auto-expand if user prefers
              try {
                if (this.autoExpandOnIncoming && !this.expanded)
                  this.toggleExpand();
              } catch {
                /* ignore */
              }

              // Start incoming ringtone immediately
              try {
                this.ringtone.startRingback(
                  RINGBACK_INCOMING_LEVEL,
                  RINGTONE_SRC
                );
              } catch (e) {
                this.logger.warn('Failed to start incoming ringtone', e);
              }

              // Desktop notification
              try {
                if (typeof Notification !== 'undefined') {
                  if (Notification.permission === 'granted') {
                    new Notification('Incoming call', {
                      body: this.incomingFrom() || 'Unknown caller',
                      tag: 'softphone-incoming',
                    });
                  } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then((perm) => {
                      if (perm === 'granted') {
                        new Notification('Incoming call', {
                          body: this.incomingFrom() || 'Unknown caller',
                          tag: 'softphone-incoming',
                        });
                      }
                    });
                  }
                }
              } catch (e) {
                this.logger.warn('Notification failed', e);
              }
            }

            // Attach track handler and attach any existing receivers using audio service
            try {
              if (sess?.connection) {
                const pc = sess.connection as RTCPeerConnection;
                try {
                  pc.addEventListener('track', (ev2: any) => {
                    try {
                      this.audioSvc.attachTrackEvent(ev2);
                    } catch (ee) {
                      this.logger.warn('audioSvc attachTrackEvent failed', ee);
                    }
                  });
                } catch (e) {
                  this.logger.warn('addEventListener(track) failed', e);
                }

                try {
                  // attempt to attach already-present receivers
                  if (!this.audioSvc.attachReceiversFromPC(pc)) {
                    // nothing attached from receivers
                  }
                } catch (e) {
                  this.logger.warn('audioSvc attachReceiversFromPC failed', e);
                }

                // initialize audio element reference
                try {
                  this.audioSvc.initAudioElement(REMOTE_AUDIO_ELEMENT_ID);
                } catch (e) {
                  this.logger.warn('initAudioElement failed', e);
                }
              }
            } catch (e) {
              this.logger.warn('attachSession track handler failed', e);
            }

            break;
          }
          case 'track': {
            // forward to audio service for consistency
            try {
              this.audioSvc.attachTrackEvent((ev && ev.payload) || ev);
            } catch (e) {
              this.logger.warn('track event forward failed', e);
            }
            break;
          }
        }
      });

    // Авто-SIP авторизация, если есть сохранённые данные и ещё не подключено
    if (!this.autoConnectAttempted && this.sipUser && this.sipPassword) {
      this.autoConnectAttempted = true;
      setTimeout(() => {
        if (!this.softphone.isRegistered()) {
          this.connect();
        }
      }, 50);
    }

    this.toggleScripts();
  }

  // Select visible tab and manage scripts panel state
  selectTab(tab: 'dial' | 'history' | 'info' | 'scenarios') {
    try {
      this.activeTab = tab;
      if (tab === 'scenarios') {
        // open scripts panel and load scripts if not already open
        if (!this.showScripts()) this.toggleScripts();
      } else {
        // hide scripts panel when leaving scenarios tab
        try {
          this.showScripts.set(false);
        } catch {}
      }
    } catch (e) {
      this.logger.warn('selectTab failed', e);
    }
  }

  // Toggle scripts panel visibility and load scripts when opening
  toggleScripts() {
    try {
      const opening = !this.showScripts();
      this.showScripts.set(opening);
      if (opening) {
        // load active scripts once when opened
        try {
          this.logger.info('Requesting active call scripts (tree) from API');
          this.callScripts.getCallScriptsTree(true).subscribe(
            (list) => {
              this.logger.info('Call scripts tree response received', {
                count: (list || []).length,
              });
              try {
                const mapNode = (s: any) => ({
                  id: s.id,
                  title: s.title,
                  description: s.description,
                  steps: s.steps,
                  questions: s.questions,
                  tips: s.tips,
                  category: s.category?.name || s.category || null,
                  bookmarked: false,
                  recentlyUsed: false,
                  children: (s.children || []).map((c: any) => mapNode(c)),
                });
                const mapped = (list || []).map((s: any) => mapNode(s));
                this.scripts.set(mapped as any);
                this.logger.debug('Mapped scripts (tree)', mapped);
              } catch (mapErr) {
                this.logger.warn('Mapping call scripts tree failed', mapErr);
                this.scripts.set(list || ([] as any));
              }
            },
            (err) => {
              this.logger.error('Failed to load call scripts tree', err);
              this.scripts.set([]);
            }
          );
        } catch (e) {
          this.logger.warn('callScripts.getActiveCallScripts failed', e);
        }
      }
    } catch (e) {
      this.logger.warn('toggleScripts failed', e);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Унифицированные хендлеры событий звонка
  private handleCallProgress(e: JsSIPSessionEvent) {
    this.logger.info('Call is in progress', e);
    this.status.set('Ringing...');
    // Use outgoing ringtone while dialing
    if (this.incoming()) {
      this.ringtone.startRingback(RINGBACK_DEFAULT_LEVEL, RINGTONE_SRC);
    } else {
      this.ringtone.startRingback(
        RINGBACK_DEFAULT_LEVEL,
        OUTGOING_RINGTONE_SRC
      );
    }
  }

  private handleCallConfirmed(e: JsSIPSessionEvent) {
    this.logger.info('Call confirmed', e);
    this.status.set('Call in progress');
    this.callActive.set(true);
    this.activeTab = 'info'; // Switch to info tab when call connects
    this.startCallTimer();
    this.ringtone.stopRingback();
    // Debug: list RTCPeerConnection senders/receivers and track state for diagnosing one-way audio
    try {
      const pc: RTCPeerConnection | undefined = this.currentSession?.connection;
      if (pc) {
        // brief local summary
        try {
          const senders = pc.getSenders?.() ?? [];
          this.logger.debug(
            'PC senders:',
            senders.map((s) => ({
              kind: s.track?.kind,
              enabled: s.track?.enabled,
              id: s.track?.id,
              label: s.track?.label,
            }))
          );
          const receivers = pc.getReceivers?.() ?? [];
          this.logger.debug(
            'PC receivers:',
            receivers.map((r) => ({
              kind: r.track?.kind,
              id: r.track?.id,
              label: r.track?.label,
            }))
          );
        } catch (e) {
          this.logger.warn('failed to enumerate senders/receivers', e);
        }
        // centralized diagnostics
        try {
          this.audioSvc.logPCDiagnostics(pc);
        } catch (e) {
          this.logger.warn('audioSvc.logPCDiagnostics failed', e);
        }
      }
    } catch (err) {
      this.logger.warn('peer connection inspection failed', err);
    }
  }

  private handleCallEnded(e: JsSIPSessionEvent) {
    this.logger.info('Call ended with cause:', e.data?.cause);
    // detect missed incoming calls (incoming shown but never answered)
    const wasMissed = this.incoming() && !this.callActive();
    this.callActive.set(false);
    this.ringtone.stopRingback();
    // Stop local timer but keep the displayed elapsed time until we reconcile with CDR
    this.stopCallTimer();
    this.onHold.set(false);
    // If missed, increment counter
    if (wasMissed) {
      try {
        this.missedCallCount = (this.missedCallCount || 0) + 1;
        localStorage.setItem(
          'softphone.missedCount',
          String(this.missedCallCount)
        );
      } catch {
        /* ignore */
      }
    }

    this.incoming.set(false);
    this.incomingFrom.set(null);
    this.currentSession = null;
    // play busy tone if ended due to busy or other error-like cause
    const causeStr = e.data?.cause ? String(e.data?.cause) : '';
    if (causeStr.toLowerCase().includes('busy') || causeStr === '486') {
      this.ringtone.playOneShot(BUSY_RINGTONE_SRC, 0.8, 1000);
    }
    this.status.set(
      this.isRegistered()
        ? 'Registered!'
        : `Call ended: ${e.data?.cause || 'Normal clearing'}`
    );
  }

  private handleCallFailed(e: JsSIPSessionEvent) {
    this.logger.info('Call failed with cause:', e);
    this.callActive.set(false);
    this.stopCallTimer();
    // stop any ringback and play busy/error tone to signal failure
    this.ringtone.stopRingback();
    this.ringtone.playOneShot(BUSY_RINGTONE_SRC, 0.8, 1000);
    // Ensure incoming UI/state is cleared when call fails
    this.incoming.set(false);
    this.incomingFrom.set(null);
    this.currentSession = null;
    this.status.set(
      this.isRegistered()
        ? 'Registered!'
        : `Call failed: ${e.data?.cause || 'Unknown reason'}`
    );
  }

  registrationFailed(e: JsSIPRegisterEvent) {
    this.logger.error('Registration failed:', e);
    this.status.set('Registration failed: ' + e.cause);
    // Log detailed error information
    this.ringtone.stopRingback();
    if (e.response) {
      this.logger.error('SIP response:', e.response);
    }
  }

  private isRegistered(): boolean {
    return this.softphone.isRegistered();
  }

  private startCallTimer() {
    this.callStart = Date.now();
    this.updateDuration();
    this.durationTimer = setInterval(() => this.updateDuration(), 1000);
  }
  // ringtone logic handled by RingtoneService
  private stopCallTimer() {
    if (this.durationTimer !== null) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    this.callStart = null;
  }
  private updateDuration() {
    if (!this.callStart) return;
    const diff = Math.floor((Date.now() - this.callStart) / 1000);
    const mm = String(Math.floor(diff / 60)).padStart(2, '0');
    const ss = String(diff % 60).padStart(2, '0');
    this.callDuration.set(`${mm}:${ss}`);
  }

  // Generate a lightweight client-side id to correlate frontend logs with Asterisk
  private generateClientCallId(): string {
    return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  // Unified extraction of an identifier to use when saving call logs.
  // Prefer client-generated id (attached to session), fall back to session id or call_id.
  private getSessionCallKey(session: JsSIPSession | null): string | null {
    try {
      if (!session) return null;
      const s = session as any;
      if (s.__clientCallId) return String(s.__clientCallId);
      if (s.call_id) return String(s.call_id);
      if (s.id) return String(s.id);
      // attempt to read SIP Call-ID from request headers
      try {
        const hdr =
          s.request?.getHeader?.('Call-ID') ??
          s.request?.headers?.['call-id']?.[0]?.raw;
        if (hdr) return String(hdr);
      } catch {}
      return null;
    } catch (e) {
      return null;
    }
  }

  private extractNumber(s: string) {
    if (!s) return '';
    // extract continuous digits and optional leading +
    const m = s.match(/\+?\d+/g);
    if (!m) return s.replace(/\D/g, '');
    return m.join('');
  }

  connect() {
    if (!this.sipUser || !this.sipPassword) {
      this.status.set('Введите SIP логин и пароль');
      return;
    }

    // Проверяем доступ к микрофону перед подключением
    this.checkMicrophoneAccess();

    // Delegate to service to create and start UA
    this.status.set('Connecting...');
    this.softphone.connect(this.sipUser, this.sipPassword, this.asteriskHost);
  }

  // Handle pause change emission from status bar
  async onMemberPauseChange(ev: { paused: boolean; reason?: string }) {
    try {
      const paused = await lastValueFrom(
        this.queueMembersSvc.pause({
          paused: ev.paused,
          reason_paused: ev.reason,
        })
      );

      if (paused) {
        this.memberPaused.set(ev.paused ? true : false);
        this.memberReason.set(ev.reason || '');
      }
    } catch (e) {
      this.logger.error('Failed to update queue member pause state', e);
      // Revert optimistic update on failure
      if (this.currentMember) {
        this.memberPaused.set(Boolean(this.currentMember.paused));
        this.memberReason.set(this.currentMember.reason_paused || '');
      }
    }
  }

  toggleExpand() {
    this.expanded = !this.expanded;
    try {
      localStorage.setItem('softphone.expanded', this.expanded ? '1' : '0');
      if (this.expanded) {
        // clearing missed count when the user opens the softphone
        this.missedCallCount = 0;
        localStorage.setItem('softphone.missedCount', '0');
      }
    } catch {
      // ignore
    }
  }

  // User answers the incoming call
  answerIncoming() {
    if (!this.incoming() || !this.currentSession) return;
    try {
      this.softphone.answer(this.currentSession);
      this.incoming.set(false);
      this.status.set('Call answered');
      this.ringtone.stopRingback();
    } catch (err) {
      this.logger.error('Answer failed', err);
      this.status.set('Answer failed');
    }
  }

  // User rejects the incoming call
  rejectIncoming() {
    if (!this.incoming() || !this.currentSession) return;
    try {
      this.softphone.reject(this.currentSession);
      this.incoming.set(false);
      this.status.set('Call rejected');
      this.ringtone.stopRingback();
    } catch (err) {
      this.logger.error('Reject failed', err);
      this.status.set('Reject failed');
    }
  }

  call() {
    if (!this.callee) {
      this.status.set('Введите номер абонента');
      return;
    }
    if (!this.softphone.isRegistered()) {
      this.status.set('Сначала необходимо подключиться');
      return;
    }

    this.status.set(`Calling ${this.callee}...`);
    try {
      // generate a client-side id we can correlate with Asterisk via SIP header
      const clientCallId = this.generateClientCallId();
      const opts = {
        extraHeaders: [
          `X-Client-Call-ID: ${clientCallId}`,
          'X-Custom-Header: CRM Call',
        ],
        mediaConstraints: { audio: true, video: false },
        pcConfig: { iceServers: [], rtcpMuxPolicy: 'require' },
      };

      const session = this.softphone.call(
        `sip:${this.callee}@${this.asteriskHost}`,
        opts
      );
      try {
        (session as any).__clientCallId = clientCallId;
      } catch {}
      this.currentSession = session;
      this.callActive.set(true);
      this.logger.info('Call session created:', session, { clientCallId });
    } catch (error) {
      this.logger.error('Error initiating call:', error);
      this.status.set('Ошибка при совершении вызова');
    }
  }

  hangup() {
    this.softphone.hangup();
  }

  // Manual CDR / call log registration triggered from scripts panel
  manualRegisterCall(payload?: {
    branchId?: string | null;
    note?: string;
    createTask?: boolean;
  }) {
    try {
      const callId = this.getSessionCallKey(this.currentSession);
      const noteToSave = payload?.note ?? this.callNote();
      const branch = payload?.branchId ?? this.selectedScriptBranch();

      this.callHistoryService
        .saveCallLog(callId, {
          note: noteToSave,
          callType: this.callType(),
          scriptBranch: branch,
        })
        .then(() => this.logger.info('Manual CDR registered'))
        .catch((err) =>
          this.logger.warn('Manual CDR registration failed', err)
        );

      // If requested, open task modal with prefilled title/description
      if (payload?.createTask) {
        // find script title by id
        const findTitle = (
          list: any[] | undefined,
          id?: string | null
        ): string | null => {
          if (!list || !id) return null;
          for (const s of list) {
            if (s.id === id) return s.title;
            const found = findTitle(s.children, id);
            if (found) return found;
          }
          return null;
        };
        const scriptsList = this.scripts() || [];
        const title = findTitle(scriptsList, branch) || 'Task from script';
        try {
          this.taskModal.openModal({ mode: 'create', title, note: noteToSave });
        } catch (e) {
          this.logger.warn('Opening task modal failed', e);
        }
      }
    } catch (e) {
      this.logger.warn('manualRegisterCall failed', e);
    }
  }

  onSelectedBranch(id: string | null) {
    try {
      this.selectedScriptBranch.set(id);
    } catch (e) {
      this.logger.warn('onSelectedBranch failed', e);
    }
  }

  // Toggle local audio track enabled state
  toggleMute() {
    if (!this.callActive() || !this.currentSession) return;
    try {
      const newMuted = !this.muted();
      const pc: RTCPeerConnection | undefined =
        this.currentSession['connection'];
      if (pc) {
        pc.getSenders()?.forEach((sender) => {
          if (sender.track && sender.track.kind === 'audio') {
            sender.track.enabled = !newMuted;
          }
        });
      }
      this.muted.set(newMuted);
      this.status.set(this.muted() ? 'Microphone muted' : 'Call in progress');
    } catch (e) {
      this.logger.error('Mute toggle failed', e);
    }
  }

  // Hold / Unhold using JsSIP built-in re-INVITE logic
  toggleHold() {
    if (!this.callActive() || !this.currentSession) return;
    if (this.holdInProgress()) return;
    try {
      this.holdInProgress.set(true);
      const goingToHold = !this.onHold();
      if (goingToHold) {
        this.status.set('Placing on hold...');
        this.softphone.hold();
      } else {
        this.status.set('Resuming call...');
        this.softphone.unhold();
      }
    } catch (e) {
      this.logger.error('Hold toggle failed', e);
      this.holdInProgress.set(false);
    }
  }

  // Метод для проверки доступа к микрофону
  checkMicrophoneAccess() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.microphoneError.set(false);
        // Освобождаем ресурсы после проверки
        stream.getTracks().forEach((track) => track.stop());
      })
      .catch((error) => {
        this.logger.error('Microphone access denied:', error);
        this.microphoneError.set(true);
        this.status.set('Для звонков необходим доступ к микрофону');
      });
  }

  // Dial pad interactions
  pressKey(key: string) {
    if (/[0-9*#]/.test(key)) {
      if (this.callActive()) {
        try {
          this.softphone.sendDTMF(key);
          this.dtmfSequence = (this.dtmfSequence + key).slice(-32); // keep last 32 keys
          this.status.set(`DTMF: ${key}`);
        } catch (e) {
          this.logger.warn('DTMF send failed', e);
        }
        return; // do not modify callee while in call
      } else {
        this.callee += key;
      }
    }
  }
  clearDtmf() {
    this.dtmfSequence = '';
  }
  clearNumber() {
    this.callee = '';
  }
  removeLast() {
    this.callee = this.callee.slice(0, -1);
  }

  // Clipboard paste support
  @HostListener('window:paste', ['$event'])
  onPaste(e: ClipboardEvent) {
    // If a call is active we don't change the dialer
    if (this.callActive) return;

    // If user has focus inside an editable element (input/textarea/contenteditable)
    // let the native paste happen so app-wide text fields still accept paste.
    const active = document.activeElement as HTMLElement | null;
    const inEditable = !!(
      active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable)
    );

    const text = e.clipboardData?.getData('text') || '';
    if (!text) return;

    if (inEditable) {
      // Allow normal paste into focused editable fields
      return;
    }

    // Otherwise intercept the paste and try to extract a phone number
    e.preventDefault();
    this.applyClipboardNumber(text);
  }

  // Initiate transfer via backend
  async transfer(type: 'blind' | 'attended' = 'blind') {
    if (!this.callActive()) {
      this.status.set('No active call to transfer');
      return;
    }
    if (!this.transferTarget) {
      this.status.set('Enter transfer target (e.g. SIP/1000)');
      return;
    }
    try {
      this.status.set('Transferring...');
      await this.softphone.transfer(this.transferTarget, type);
    } catch (err) {
      this.logger.error('Transfer request failed', err);
      this.status.set('Transfer request failed');
    }
  }

  private applyClipboardNumber(raw: string) {
    const cleaned = raw.replace(/[^0-9*#+]/g, '');
    if (!cleaned) return;
    this.callee = cleaned;
    this.status.set(`Number pasted (${cleaned.length} digits)`);
  }

  // Handle call number from history
  onCallNumber(number: string) {
    this.callee = number;
    this.activeTab = 'dial';
  }

  // Handle view contact from history
  onViewContact(contactId: string) {
    this.logger.debug('View contact:', contactId);
    // TODO: Navigate to contact page
  }

  // Apply hold state locally: disable outgoing audio senders and pause/resume remote audio playback
  private applyHoldState(hold: boolean) {
    try {
      // Remember/restore microphone muted state around hold
      const pc: RTCPeerConnection | undefined = this.currentSession?.connection;

      if (hold) {
        // store whether user had microphone muted before placing on hold
        this.preHoldMuted = this.preHoldMuted ?? this.muted();
      }

      // Disable or enable local audio senders
      try {
        if (pc) {
          pc.getSenders()?.forEach((sender) => {
            if (sender.track && sender.track.kind === 'audio') {
              try {
                sender.track.enabled = !hold;
              } catch (e) {
                // Some browsers may not allow changing track state; ignore
              }
            }
          });
        }
      } catch (e) {
        this.logger.warn('applyHoldState: manipulating senders failed', e);
      }

      // Update component muted state: when placed on hold we show muted, on resume restore previous state
      if (hold) {
        this.muted.set(true);
      } else {
        this.muted.set(this.preHoldMuted ?? false);
        this.preHoldMuted = null;
      }

      // Mute or restore remote audio element to avoid hearing hold music/tones locally
      try {
        const audio = document.getElementById(
          REMOTE_AUDIO_ELEMENT_ID
        ) as HTMLAudioElement | null;
        if (audio) {
          if (hold) {
            // store previous volume so we can restore it
            try {
              (audio as any).dataset.__preHoldVolume = String(
                audio.volume ?? 1
              );
            } catch {}
            audio.muted = true;
            audio.volume = 0;
          } else {
            const prev = (audio as any).dataset?.__preHoldVolume;
            if (prev !== undefined) {
              audio.volume = Number(prev) || 1;
              try {
                delete (audio as any).dataset.__preHoldVolume;
              } catch {}
            } else {
              audio.volume = 1;
            }
            audio.muted = false;
            // try to resume playback if it was paused
            try {
              const p = audio.play();
              if (p && typeof (p as any).then === 'function')
                (p as Promise<void>).catch(() => {});
            } catch {}
          }
        }
      } catch (e) {
        this.logger.warn('applyHoldState: remote audio handling failed', e);
      }
    } catch (e) {
      this.logger.warn('applyHoldState failed', e);
    }
  }
}
