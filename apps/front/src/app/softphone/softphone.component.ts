import {
  Component,
  ElementRef,
  OnInit,
  HostListener,
  OnDestroy,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  SoftphoneStatusBarComponent,
  SoftphoneCallInfoComponent,
  SoftphoneCallActionsComponent,
  SoftphoneScriptsPanelComponent,
} from './components';
import { SoftphoneDialTabComponent } from './components/softphone-dial-tab.component';
import { SoftphoneInfoTabComponent } from './components/softphone-info-tab.component';
import { SoftphoneCallHistoryComponent } from './components/softphone-call-history/softphone-call-history.component';
import { SoftphoneCallHistoryService as CallLogService } from './components/softphone-call-history/softphone-call-history.service';
import { CallDetailsDialogComponent } from './components/call-details-dialog/call-details-dialog.component';
import { CdrRecord } from './types/cdr.types';
import { TaskModalService } from '../tasks/services/task-modal.service';
import { TaskModalComponent } from '../tasks/components/task-modal/task-modal.component';
import {
  QueueMembersService,
  QueueMemberRecord,
} from '../contact-center/services/queue-members.service';
import { AgentStatusService } from '../contact-center/services/agent-status.service';
import { AgentStatusEnum } from '../contact-center/types/agent-status.types';
import { ContactCenterMonitoringService } from '../contact-center/services/contact-center-monitoring.service';
import { SoftphonePanelService } from './services/softphone-panel.service';
import { SoftphoneCallStateService } from './services/softphone-call-state.service';
import { SoftphoneSessionService } from './services/softphone-session.service';

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
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(50px) scale(0.9)' }),
        animate('400ms cubic-bezier(0.34, 1.56, 0.64, 1)', 
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ])
  ],
  imports: [
    FormsModule,
    CommonModule,
    MatIconModule,
    MatDialogModule,
    SoftphoneStatusBarComponent,
    SoftphoneCallActionsComponent,
    SoftphoneScriptsPanelComponent,
    SoftphoneDialTabComponent,
    SoftphoneInfoTabComponent,
    SoftphoneCallHistoryComponent,
    TaskModalComponent,
  ],
})
export class SoftphoneComponent implements OnInit, OnDestroy {
  status = signal('Disconnected');
  microphoneError = signal(false);
  private currentSession: JsSIPSession | null = null;
  private callLogSaved = false; // Флаг для предотвращения повторного сохранения
  private fetchingCallID = false; // Флаг для предотвращения одновременных запросов
  private preCallStatus: AgentStatusEnum | null = null; // Статус до начала звонка

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

  // Call scripts UI
  scripts = signal<any[]>([]);
  showScripts = signal(false);
  // Expose script panel state for template
  viewMode = signal<'compact' | 'fullscreen'>('compact');
  viewedScript = signal<any>(null);
  private currentCallId = signal<string>(null);

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
  private readonly callHistoryService = inject(CallLogService);
  private readonly taskModal = inject(TaskModalService);
  private readonly queueMembersSvc = inject(QueueMembersService);
  private readonly agentStatusSvc = inject(AgentStatusService);
  private readonly monitoringSvc = inject(ContactCenterMonitoringService);
  readonly panelSvc = inject(SoftphonePanelService);
  readonly callState = inject(SoftphoneCallStateService);
  private readonly sessionSvc = inject(SoftphoneSessionService);
  private readonly dialog = inject(MatDialog);

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
  // Missed calls counter shown on minimized badge
  missedCallCount = 0;
  // Auto-expand softphone on incoming call
  autoExpandOnIncoming = true;

  // Panel resize handling
  private panelResizeObserver: ResizeObserver | null = null;
  private expandedPanelEl: HTMLElement | null = null;
  private panelResizeDragStart:
    | {
        startX: number;
        startY: number;
        startW: number;
        startH: number;
      }
    | null = null;
  private onPanelResizeDragMove?: (ev: MouseEvent) => void;
  private onPanelResizeDragUp?: (ev: MouseEvent) => void;

  @ViewChild('expandedPanel')
  set expandedPanelRef(ref: ElementRef<HTMLElement> | undefined) {
    this.detachPanelResizeObserver();
    this.expandedPanelEl = ref?.nativeElement ?? null;
    if (!this.expandedPanelEl) return;

    // Apply restored size immediately to avoid ResizeObserver capturing default size first.
    this.applyPanelSizeToElement(this.expandedPanelEl);
    this.attachPanelResizeObserver(this.expandedPanelEl);
    this.applyDockOffsetSoon();
  }

  private applyPanelSizeToElement(el: HTMLElement) {
    const w = this.panelSvc.panelWidth();
    const h = this.panelSvc.panelHeight();
    if (Number.isFinite(w) && w && w > 0) {
      el.style.width = `${Math.round(Math.max(this.panelSvc.minWidthPx, w))}px`;
    }
    if (Number.isFinite(h) && h && h > 0) {
      el.style.height = `${Math.round(Math.max(this.panelSvc.minHeightPx, h))}px`;
    }
  }

  // Current operator queue member record (if any)
  currentMember: QueueMemberRecord | null = null;
  memberPaused = signal(false);
  memberReason = signal('');
  
  // Agent status (new system)
  currentAgentStatus = signal<AgentStatusEnum>(AgentStatusEnum.OFFLINE);

  ngOnInit() {
    try {
      const savedAuto = localStorage.getItem('softphone.autoExpandOnIncoming');
      if (savedAuto !== null) this.autoExpandOnIncoming = savedAuto === '1';
      const savedMissed = localStorage.getItem('softphone.missedCount');
      if (savedMissed !== null) this.missedCallCount = Number(savedMissed) || 0;
    } catch {
      // ignore
    }

    this.applyDockOffsetSoon();

    // Subscribe to agent status from service
    this.agentStatusSvc.getCurrentAgentStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((agentStatus) => {
        if (agentStatus) {
          this.currentAgentStatus.set(agentStatus.status);
        }
      });

    // Subscribe to softphone events coming from the service
    this.softphone.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async (ev) => {
        switch (ev.type) {
          case 'registered':
            this.status.set('Вход выполнен!');
            // Set agent status to ONLINE when registered
            this.setAgentOnline();
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
            this.callState.setHold(true, false);
            this.status.set('Call on hold');
            try {
              this.callState.savePreHoldMuteState();
              this.sessionSvc.applyHoldState(
                this.currentSession,
                true,
                REMOTE_AUDIO_ELEMENT_ID,
                (muted) => this.callState.setMuted(muted)
              );
            } catch (e) {
              this.logger.warn('applyHoldState on hold failed', e);
            }
            break;
          case 'unhold':
            // Session resumed from hold
            this.callState.setHold(false, false);
            this.status.set(
              this.callState.callActive()
                ? 'Call in progress'
                : this.isRegistered()
                ? 'Registered!'
                : 'Disconnected'
            );
            try {
              this.callState.restorePreHoldMuteState();
              this.sessionSvc.applyHoldState(
                this.currentSession,
                false,
                REMOTE_AUDIO_ELEMENT_ID,
                (muted) => this.callState.setMuted(muted)
              );
            } catch (e) {
              this.logger.warn('applyHoldState on unhold failed', e);
            }
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
              this.activeTab = 'info';

              // try to extract caller display or remote identity
              const from =
                (sess &&
                  (sess.remote_identity?.uri ||
                    sess.remote_identity?.display_name)) ||
                (ev.payload && ev.payload.from) ||
                null;
              const fromStr = typeof from === 'string' ? from : from?.toString?.() ?? null;
              this.callState.setIncomingCall(fromStr);
              
              // Resolve caller name from contacts
              if (fromStr) {
                this.resolveCallerName(fromStr);
              }
              
              this.status.set(
                `Incoming call${
                  this.callState.incomingFrom() ? ' from ' + this.callState.incomingFrom() : ''
                }`
              );
              this.logger.info('Incoming call from:', this.callState.incomingFrom());

              // Auto-expand if user prefers
              try {
                if (this.autoExpandOnIncoming && !this.panelSvc.expanded())
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
                      body: this.callState.incomingFrom() || 'Unknown caller',
                      tag: 'softphone-incoming',
                      requireInteraction: true,
                    });
                  } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then((perm) => {
                      if (perm === 'granted') {
                        new Notification('Incoming call', {
                          body: this.callState.incomingFrom() || 'Unknown caller',
                          tag: 'softphone-incoming',
                          requireInteraction: true,
                        });
                      }
                    });
                  }
                }
              } catch (e) {
                this.logger.warn('Notification failed', e);
              }

              // Vibrate device if supported (mobile/touch devices)
              try {
                if ('vibrate' in navigator) {
                  // Vibrate pattern: vibrate 200ms, pause 100ms, repeat 3 times
                  navigator.vibrate([200, 100, 200, 100, 200]);
                }
              } catch (e) {
                this.logger.warn('Vibration failed', e);
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

    // Note: Tab closure and SIP disconnection are now handled reliably by EndpointSyncService
    // via AMI/ARI endpoint tracking. No need for unreliable beforeunload handlers.
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
    this.stopResizeDrag();
    this.detachPanelResizeObserver();
    this.panelSvc.clearDockOffset();
    this.panelSvc.cleanup();
    this.callState.cleanup();
    // Note: SIP disconnection on tab closure handled by EndpointSyncService via AMI tracking
  }

  onPanelMouseMove(ev: MouseEvent) {
    if (this.panelSvc.panelResizing()) return;
    const el = this.expandedPanelEl;
    if (!el) return;
    if (el.classList.contains('scripts-expanded')) {
      el.style.cursor = '';
      return;
    }

    const rect = el.getBoundingClientRect();
    const edge = 10;
    const nearLeft = ev.clientX - rect.left <= edge;
    const nearTop = !this.panelSvc.pinned() && ev.clientY - rect.top <= edge;

    if (nearLeft && nearTop) el.style.cursor = 'nwse-resize';
    else if (nearLeft) el.style.cursor = 'ew-resize';
    else if (nearTop) el.style.cursor = 'ns-resize';
    else el.style.cursor = '';
  }

  onPanelMouseLeave() {
    if (this.panelSvc.panelResizing()) return;
    const el = this.expandedPanelEl;
    if (!el) return;
    el.style.cursor = '';
  }

  onPanelMouseDown(ev: MouseEvent) {
    const el = this.expandedPanelEl;
    if (!el) return;
    if (el.classList.contains('scripts-expanded')) return;

    const rect = el.getBoundingClientRect();
    const edge = 10;
    const nearLeft = ev.clientX - rect.left <= edge;
    const nearTop = !this.panelSvc.pinned() && ev.clientY - rect.top <= edge;
    if (!nearLeft && !nearTop) return;

    ev.preventDefault();
    ev.stopPropagation();

    this.panelSvc.panelResizing.set(true);
    this.panelResizeDragStart = {
      startX: ev.clientX,
      startY: ev.clientY,
      startW: Math.round(rect.width),
      startH: Math.round(rect.height),
    };

    this.onPanelResizeDragMove = (moveEv: MouseEvent) => {
      if (!this.panelResizeDragStart) return;

      const dx = this.panelResizeDragStart.startX - moveEv.clientX;
      const dy = this.panelResizeDragStart.startY - moveEv.clientY;

      const maxW = Math.max(this.panelSvc.minWidthPx, window.innerWidth - 48);
      const maxH = Math.max(this.panelSvc.minHeightPx, window.innerHeight - 48);

      const nextW = nearLeft
        ? Math.min(
            maxW,
            Math.max(
              this.panelSvc.minWidthPx,
              this.panelResizeDragStart.startW + dx
            )
          )
        : this.panelResizeDragStart.startW;

      const nextH = nearTop
        ? Math.min(
            maxH,
            Math.max(
              this.panelSvc.minHeightPx,
              this.panelResizeDragStart.startH + dy
            )
          )
        : this.panelResizeDragStart.startH;

      this.panelSvc.setPanelSize(Math.round(nextW), Math.round(nextH));
      this.applyDockOffset();
    };

    this.onPanelResizeDragUp = () => {
      this.stopResizeDrag();
    };

    window.addEventListener('mousemove', this.onPanelResizeDragMove);
    window.addEventListener('mouseup', this.onPanelResizeDragUp);
  }

  private stopResizeDrag() {
    if (this.onPanelResizeDragMove) {
      window.removeEventListener('mousemove', this.onPanelResizeDragMove);
      this.onPanelResizeDragMove = undefined;
    }
    if (this.onPanelResizeDragUp) {
      window.removeEventListener('mouseup', this.onPanelResizeDragUp);
      this.onPanelResizeDragUp = undefined;
    }
    this.panelResizeDragStart = null;
    this.panelSvc.panelResizing.set(false);
    if (this.expandedPanelEl) this.expandedPanelEl.style.cursor = '';
  }

  private attachPanelResizeObserver(el: HTMLElement) {
    // No-op in environments without ResizeObserver
    if (typeof ResizeObserver === 'undefined') return;

    this.panelResizeObserver = new ResizeObserver(() => {
      // Ignore fullscreen scripts mode where size is forced
      if (el.classList.contains('scripts-expanded')) return;

      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w <= 0 || h <= 0) return;

      const currentW = this.panelSvc.panelWidth();
      const currentH = this.panelSvc.panelHeight();
      const hasPersistedSize =
        Number.isFinite(currentW) &&
        currentW !== undefined &&
        currentW > 0 &&
        Number.isFinite(currentH) &&
        currentH !== undefined &&
        currentH > 0;

      // On initial render, ResizeObserver may fire before bindings settle.
      // If we already have a persisted size and user is not actively resizing,
      // do not overwrite the restored size with a default-measured size.
      if (hasPersistedSize && !this.panelSvc.panelResizing()) {
        this.applyDockOffset();
        return;
      }

      // When pinned, height is derived (100vh). Keep persisted height for unpinned mode.
      if (this.panelSvc.pinned()) {
        this.panelSvc.setPanelSize(w, this.panelSvc.panelHeight() ?? this.panelSvc.minHeightPx);
        this.applyDockOffset();
        return;
      }

      this.panelSvc.setPanelSize(w, h);
      this.applyDockOffset();
    });

    this.panelResizeObserver.observe(el);
  }

  private detachPanelResizeObserver() {
    // Ensure we don't lose the latest size due to debounced save
    const measured = this.expandedPanelEl?.getBoundingClientRect();
    this.panelSvc.persistPanelSizeNow(measured?.width, measured?.height);
    if (this.panelResizeObserver) {
      try {
        this.panelResizeObserver.disconnect();
      } catch {
        // ignore
      }
      this.panelResizeObserver = null;
    }
  }

  // Унифицированные хендлеры событий звонка
  private handleCallProgress(e: JsSIPSessionEvent) {
    this.logger.info('Call is in progress', e);
    this.status.set('Ringing...');
    // Use outgoing ringtone while dialing
    if (this.callState.incoming()) {
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
    this.callState.setCallActive(true);
    this.activeTab = 'info'; // Switch to info tab when call connects
    this.ringtone.stopRingback();

    // Auto-switch to ON_CALL when call is active
    if (this.currentAgentStatus() !== AgentStatusEnum.ON_CALL) {
      // Save pre-call status to restore after call ends
      this.preCallStatus = this.currentAgentStatus();
      this.currentAgentStatus.set(AgentStatusEnum.ON_CALL);
      this.logger.info(`Status changed to ON_CALL (was: ${this.preCallStatus})`);
      // Note: We don't persist ON_CALL to backend as it's too transient
      // Backend will track this via CDR and active channels
    }

    // Получаем UNIQUEID через AMI и сохраняем лог с правильным ID
    this.fetchCurrentCallID();

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
    const wasMissed = this.callState.incoming() && !this.callState.callActive();
    this.ringtone.stopRingback();
    this.callState.resetCallState();
    
    // Restore pre-call status
    this.restorePreCallStatus();
    
    // Сбрасываем флаги сохранения лога для следующего звонка
    this.callLogSaved = false;
    this.fetchingCallID = false;
    
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
    // stop any ringback and play busy/error tone to signal failure
    this.ringtone.stopRingback();
    this.ringtone.playOneShot(BUSY_RINGTONE_SRC, 0.8, 1000);
    // Ensure incoming UI/state is cleared when call fails
    this.callState.resetCallState();
    this.currentSession = null;
    
    // Restore pre-call status
    this.restorePreCallStatus();
    
    // Сбрасываем флаги сохранения лога для следующего звонка
    this.callLogSaved = false;
    this.fetchingCallID = false;
    
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

  /**
   * Restore agent status to pre-call state after call ends
   */
  private restorePreCallStatus() {
    if (this.preCallStatus && this.currentAgentStatus() === AgentStatusEnum.ON_CALL) {
      this.logger.info(`Restoring status to: ${this.preCallStatus}`);
      this.currentAgentStatus.set(this.preCallStatus);
    } else if (this.currentAgentStatus() === AgentStatusEnum.ON_CALL) {
      // Fallback to ONLINE if no pre-call status saved
      this.logger.info('Restoring status to ONLINE (fallback)');
      this.currentAgentStatus.set(AgentStatusEnum.ONLINE);
    }
    this.preCallStatus = null;
  }

  private isRegistered(): boolean {
    return this.softphone.isRegistered();
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
      this.logger.error('pause change error', e);
    }
  }

  /**
   * Handle agent status change from status bar
   */
  async onAgentStatusChange(ev: { status: AgentStatusEnum; reason?: string }) {
    if (!this.sipUser) {
      this.logger.warn('Cannot change status: no SIP user');
      return;
    }

    try {
      // Update agent status in our system
      const agentStatus = await lastValueFrom(
        this.agentStatusSvc.setStatus(this.sipUser, ev.status, {
          reason: ev.reason,
          fullName: localStorage.getItem('operator.fullName') || undefined,
        })
      );

      this.currentAgentStatus.set(agentStatus.status);
      this.logger.info(`Agent status changed to: ${agentStatus.status}`);

      // Sync with Asterisk queue member pause state (real-time)
      const shouldBePaused = ev.status !== AgentStatusEnum.ONLINE;
      try {
        await lastValueFrom(
          this.queueMembersSvc.pause({
            paused: shouldBePaused,
            reason_paused: ev.reason || agentStatus.status,
          })
        );
        this.logger.info(`Asterisk queue member pause synced: ${shouldBePaused}`);
      } catch (pauseError) {
        this.logger.warn('Failed to sync pause state with Asterisk', pauseError);
      }

      // Update local pause state for UI
      this.memberPaused.set(shouldBePaused);
      this.memberReason.set(ev.reason || '');
    } catch (e) {
      this.logger.error('status change error', e);
    }
  }

  /**
   * Set agent online (called on registration)
   * Only sets to ONLINE if current status is OFFLINE or doesn't exist
   */
  private async setAgentOnline() {
    if (!this.sipUser) return;

    try {
      // Check current status first
      let currentStatus: AgentStatusEnum | null = null;
      try {
        const existingStatus = await lastValueFrom(
          this.agentStatusSvc.getAgentStatus(this.sipUser)
        );
        currentStatus = existingStatus?.status || null;
        this.logger.info(`Current agent status: ${currentStatus}`);
      } catch (e) {
        this.logger.info('No existing agent status found');
      }

      // Only set to ONLINE if status is OFFLINE or doesn't exist
      if (!currentStatus || currentStatus === AgentStatusEnum.OFFLINE) {
        const agentStatus = await lastValueFrom(
          this.agentStatusSvc.setAgentOnline(this.sipUser, {
            fullName: localStorage.getItem('operator.fullName') || undefined,
          })
        );
        this.currentAgentStatus.set(AgentStatusEnum.ONLINE);
        this.logger.info('Agent set to ONLINE');

        // Unpause in Asterisk when going online
        try {
          await lastValueFrom(
            this.queueMembersSvc.pause({ paused: false })
          );
          this.logger.info('Asterisk queue member unpaused');
        } catch (pauseError) {
          this.logger.warn('Failed to unpause in Asterisk', pauseError);
        }
      } else {
        // Restore existing status
        this.currentAgentStatus.set(currentStatus);
        this.logger.info(`Restored existing agent status: ${currentStatus}`);
        
        // Sync Asterisk pause state based on current status
        const shouldBePaused = currentStatus !== AgentStatusEnum.ONLINE;
        try {
          await lastValueFrom(
            this.queueMembersSvc.pause({ paused: shouldBePaused })
          );
          this.logger.info(`Asterisk pause state synced: ${shouldBePaused}`);
        } catch (pauseError) {
          this.logger.warn('Failed to sync pause state with Asterisk', pauseError);
        }
      }
    } catch (e) {
      this.logger.error('Failed to set agent online', e);
    }
  }

  toggleExpand() {
    // If we're collapsing the panel, flush latest size first
    if (this.panelSvc.expanded()) {
      const measured = this.expandedPanelEl?.getBoundingClientRect();
      this.panelSvc.persistPanelSizeNow(measured?.width, measured?.height);
    }
    this.panelSvc.toggleExpanded();
    try {
      if (this.panelSvc.expanded()) {
        // clearing missed count when the user opens the softphone
        this.missedCallCount = 0;
        localStorage.setItem('softphone.missedCount', '0');
      }
    } catch {
      // ignore
    }

    this.applyDockOffsetSoon();
  }

  togglePinned() {
    this.panelSvc.togglePinned();
    this.applyDockOffsetSoon();
  }

  private applyDockOffsetSoon() {
    // Allow layout to settle (esp. on expand) before measuring.
    queueMicrotask(() => this.applyDockOffset());
  }

  private applyDockOffset() {
    const isScriptsExpanded = this.expandedPanelEl?.classList.contains('scripts-expanded') ?? false;
    this.panelSvc.applyDockOffset(this.expandedPanelEl, isScriptsExpanded);
  }

  // User answers the incoming call
  answerIncoming() {
    if (!this.callState.incoming() || !this.currentSession) return;
    try {
      this.softphone.answer(this.currentSession);
      this.callState.clearIncomingCall();
      this.status.set('Call answered');
      this.ringtone.stopRingback();
    } catch (err) {
      this.logger.error('Answer failed', err);
      this.status.set('Answer failed');
    }
  }

  // User rejects the incoming call
  rejectIncoming() {
    if (!this.callState.incoming() || !this.currentSession) return;
    try {
      this.softphone.reject(this.currentSession);
      this.callState.clearIncomingCall();
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
      // Получаем SIP Call-ID который будет использоваться для reconciliation
      const session = this.softphone.call(
        `sip:${this.callee}@${this.asteriskHost}`,
        {
          mediaConstraints: { audio: true, video: false },
          pcConfig: { iceServers: [], rtcpMuxPolicy: 'require' },
        }
      );
      
      // Отправляем SIP Call-ID в Asterisk через заголовок для сохранения в CDR userfield
      const sipCallId = session?.call_id;
      if (sipCallId) {
        try {
          // Добавляем заголовок после создания session
          (session as any).request?.setHeader?.('X-SIP-Call-ID', sipCallId);
        } catch (e) {
          this.logger.warn('Failed to set X-SIP-Call-ID header', e);
        }
      }
      
      this.currentSession = session;
      this.callState.setCallActive(true);
      this.logger.info('Call session created:', session, { sipCallId });
    } catch (error) {
      this.logger.error('Error initiating call:', error);
      this.status.set('Ошибка при совершении вызова');
    }
  }

  hangup() {
    this.softphone.hangup();
  }

  // Manual CDR / call log registration triggered from scripts panel
  async manualRegisterCall(payload?: {
    branchId?: string | null;
    note?: string;
    createTask?: boolean;
  }) {
    try {
      this.logger.info('manualRegisterCall called', { payload });
      const noteToSave = payload?.note ?? this.callState.callNote();
      const branch = payload?.branchId ?? this.callState.selectedScriptBranch();
      // Save call log first and get the log ID
      let savedLogId: string | null = null;
      try {
        this.logger.info('Saving call log...', {
          asteriskUniqueId: this.currentCallId(),
          note: noteToSave,
          callType: this.callState.callType(),
          scriptBranch: branch,
        });
        const logResult = await this.callHistoryService.saveCallLog({
          asteriskUniqueId: this.currentCallId(),  // Asterisk UNIQUEID для прямого сопоставления
          note: noteToSave,
          callType: this.callState.callType(),
          scriptBranch: branch,
        });
        this.logger.info('Call log save response', { logResult });
        savedLogId = logResult?.id || logResult?.logId || null;
        this.logger.info('Call log saved', { 
          logId: savedLogId, 
          asteriskUniqueId: this.currentCallId(),
        });
      } catch (err) {
        this.logger.warn('Call log save failed', err);
        // Continue to task creation even if log failed
      }

      // If requested, open task modal with prefilled title/description and link to call log
      this.logger.info('Checking if should open task modal', { 
        createTask: payload?.createTask,
        savedLogId 
      });
      if (payload?.createTask) {
        this.logger.info('Opening task modal...');
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
        this.logger.info('Task modal config', {
          title,
          noteToSave,
          savedLogId,
          branch
        });
        try {
          this.taskModal.openModal({ 
            mode: 'create', 
            title, 
            note: noteToSave,
            callLogId: savedLogId || undefined
          });
          this.logger.info('Task modal opened successfully');
        } catch (e) {
          this.logger.error('Opening task modal failed', e);
        }
      }
    } catch (e) {
      this.logger.error('manualRegisterCall failed', e);
    }
  }

  /**
   * Получить UNIQUEID через AMI и сохранить лог звонка
   * Вызывается при подключении звонка (confirmed event)
   */
  private async fetchCurrentCallID() {
    // Защита от повторных вызовов
    if (this.callLogSaved) {
      this.logger.info('Call log already saved, skipping duplicate request');
      return;
    }

    // Защита от одновременных запросов
    if (this.fetchingCallID) {
      this.logger.info('Already fetching call ID, skipping duplicate request');
      return;
    }

    this.fetchingCallID = true;

    try {
      console.log(this.currentSession)
      if (!this.currentSession) {
        this.logger.warn('No active session to save log for');
        return;
      }

      // Извлекаем CallerID number из remote_identity
      const remoteIdentity = this.currentSession.remote_identity;
      let callerNumber: string | null = null;

      if (remoteIdentity && remoteIdentity.uri && remoteIdentity.uri.user) {
        callerNumber = remoteIdentity.uri.user;
      }

      if (!callerNumber) {
        this.logger.warn('Could not extract caller number from session');
        // Fallback: save log without UNIQUEID
        return;
      }

      this.logger.info('Fetching UNIQUEID for caller:', callerNumber);

      // Запрашиваем UNIQUEID через API
      const response = await this.callHistoryService.getChannelUniqueId(callerNumber);
      this.currentCallId.set(response?.uniqueid);
      
      // Отмечаем что лог сохранен
      this.callLogSaved = true;
    } catch (err) {
      this.logger.error('Failed to fetch/save call log:', err);
    } finally {
      this.fetchingCallID = false;
    }
  }

  onSelectedBranch(id: string | null) {
    try {
      this.callState.setCallMetadata(undefined, undefined, id);
    } catch (e) {
      this.logger.warn('onSelectedBranch failed', e);
    }
  }

  onScriptViewModeChange(mode: 'compact' | 'fullscreen') {
    try {
      this.viewMode.set(mode);
    } catch (e) {
      this.logger.warn('onScriptViewModeChange failed', e);
    }
  }

  onScriptDetailsChange(script: any) {
    try {
      this.viewedScript.set(script);
    } catch (e) {
      this.logger.warn('onScriptDetailsChange failed', e);
    }
  }

  // Toggle local audio track enabled state
  toggleMute() {
    if (!this.callState.callActive() || !this.currentSession) return;
    try {
      const newMuted = !this.callState.muted();
      const pc: RTCPeerConnection | undefined =
        this.currentSession['connection'];
      if (pc) {
        pc.getSenders()?.forEach((sender) => {
          if (sender.track && sender.track.kind === 'audio') {
            sender.track.enabled = !newMuted;
          }
        });
      }
      this.callState.setMuted(newMuted);
      this.status.set(this.callState.muted() ? 'Microphone muted' : 'Call in progress');
    } catch (e) {
      this.logger.error('Mute toggle failed', e);
    }
  }

  // Hold / Unhold using JsSIP built-in re-INVITE logic
  toggleHold() {
    if (!this.callState.callActive() || !this.currentSession) return;
    if (this.callState.holdInProgress()) return;
    try {
      this.callState.setHold(this.callState.onHold(), true);
      const goingToHold = !this.callState.onHold();
      if (goingToHold) {
        this.status.set('Placing on hold...');
        this.softphone.hold();
      } else {
        this.status.set('Resuming call...');
        this.softphone.unhold();
      }
    } catch (e) {
      this.logger.error('Hold toggle failed', e);
      this.callState.setHold(this.callState.onHold(), false);
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
      if (this.callState.callActive()) {
        try {
          this.softphone.sendDTMF(key);
          this.callState.addDTMF(key);
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
    this.callState.clearDTMF();
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
    if (this.callState.callActive()) return;

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
    if (!this.callState.callActive()) {
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
    const cleaned = this.sessionSvc.extractNumberFromClipboard(raw);
    if (!cleaned) return;
    this.callee = cleaned;
    this.status.set(`Number pasted (${cleaned.length} digits)`);
  }

  // Handle call number from history
  callFromHistory(number: string) {
    this.callee = number;
    this.activeTab = 'dial';
    // Optionally auto-dial
    // this.call();
  }

  // Handle view call details from history
  showCallDetailsModal(call: CdrRecord) {
    this.logger.info('Opening call details dialog:', call);
    this.dialog.open(CallDetailsDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: call,
      panelClass: 'call-details-dialog-container'
    });
  }

  // Handle view contact from history
  onViewContact(contactId: string) {
    this.logger.debug('View contact:', contactId);
    // TODO: Navigate to contact page
  }

  // Resolve phone number to contact name
  private resolveCallerName(phone: string) {
    this.monitoringSvc.resolvePhoneNumber(phone).subscribe({
      next: (resolved) => {
        if (resolved.type === 'contact' && resolved.displayName !== phone) {
          this.callState.setIncomingDisplayName(resolved.displayName);
          this.logger.info('Resolved caller name:', resolved.displayName);
        }
      },
      error: (err) => {
        this.logger.warn('Failed to resolve caller name:', err);
      }
    });
  }

}
