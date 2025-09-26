import {
  Component,
  OnInit,
  HostListener,
  OnDestroy,
  inject,
} from '@angular/core';
import { environment } from '../../environments/environment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs';
import { CallsApiService } from '../calls/calls.service';
import { SoftphoneService } from './softphone.service';
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
import { SoftphoneCallHistoryComponent } from './components/softphone-call-history.component';

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
    SoftphoneCallHistoryComponent,
  ],
})
export class SoftphoneComponent implements OnInit, OnDestroy {
  status = 'Disconnected';
  // Incoming call state
  incoming = false;
  incomingFrom: string | null = null;
  callActive = false;
  muted = false;
  onHold = false;
  holdInProgress = false;
  microphoneError = false;
  private currentSession: JsSIPSession | null = null;
  // Таймер звонка
  private callStart: number | null = null;
  callDuration = '00:00';
  private durationTimer: number | null = null;

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

  // Asterisk host is read from environment config (moved from hardcoded value)
  private readonly asteriskHost = environment.asteriskHost || '127.0.0.1';

  private autoConnectAttempted = false;
  // lifecycle destroy notifier
  private readonly destroy$ = new Subject<void>();

  // inject calls API and softphone service per repo preference
  private readonly callsApi = inject(CallsApiService);
  private readonly softphone = inject(SoftphoneService);
  private readonly ringtone = inject(RingtoneService);

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
  activeTab: 'dial' | 'history' = 'dial';
  // Expand/collapse softphone UI
  expanded = true;
  // Missed calls counter shown on minimized badge
  missedCallCount = 0;
  // Auto-expand softphone on incoming call
  autoExpandOnIncoming = true;

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
    this.softphone.events$.pipe(takeUntil(this.destroy$)).subscribe((ev) => {
      switch (ev.type) {
        case 'registered':
          this.status = 'Registered!';
          break;
        case 'registrationFailed':
          this.registrationFailed(ev.payload as JsSIPRegisterEvent);
          break;
        case 'connecting':
          this.status = 'Connecting...';
          break;
        case 'connected':
          this.status = 'Connected, registering...';
          break;
        case 'disconnected':
          this.status = 'Disconnected';
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
          this.status = ev.payload?.ok
            ? 'Transfer initiated'
            : 'Transfer result: ' + (ev.payload?.error || 'unknown');
          break;
        case 'transferFailed':
          this.status = 'Transfer failed';
          break;
        case 'hold':
          // Session confirmed placed on hold
          this.onHold = true;
          this.holdInProgress = false;
          this.status = 'Call on hold';
          break;
        case 'unhold':
          // Session resumed from hold
          this.onHold = false;
          this.holdInProgress = false;
          this.status = this.callActive ? 'Call in progress' : this.isRegistered() ? 'Registered!' : 'Disconnected';
          break;
          break;
        case 'newRTCSession': {
          const sess = ev.payload?.session as JsSIPSession;
          this.currentSession = sess;
          // if session direction indicates incoming, show incoming UI
          const dir =
            (ev.payload && ev.payload.direction) ||
            (sess && sess.direction) ||
            'outgoing';
          if (dir === 'incoming' || dir === 'inbound') {
            this.incoming = true;
            // try to extract caller display or remote identity
            const from =
              (sess &&
                (sess.remote_identity?.uri ||
                  sess.remote_identity?.display_name)) ||
              (ev.payload && ev.payload.from) ||
              null;
            this.incomingFrom =
              typeof from === 'string' ? from : from?.toString?.() ?? null;
            this.status = `Incoming call${
              this.incomingFrom ? ' from ' + this.incomingFrom : ''
            }`;
            console.log('Incoming call from:', this.incomingFrom);
            // Auto-expand if user prefers
            try {
              if (this.autoExpandOnIncoming && !this.expanded) this.toggleExpand();
            } catch {
              /* ignore */
            }
            // Start incoming ringtone immediately and show desktop notification (if permitted)
            try {
              this.ringtone.startRingback(RINGBACK_INCOMING_LEVEL, RINGTONE_SRC);
            } catch (e) {
              console.warn('Failed to start incoming ringtone', e);
            }
            try {
              if (typeof Notification !== 'undefined') {
                if (Notification.permission === 'granted') {
                  new Notification('Incoming call', {
                    body: this.incomingFrom || 'Unknown caller',
                    tag: 'softphone-incoming',
                  });
                } else if (Notification.permission !== 'denied') {
                  Notification.requestPermission().then((perm) => {
                    if (perm === 'granted') {
                      new Notification('Incoming call', {
                        body: this.incomingFrom || 'Unknown caller',
                        tag: 'softphone-incoming',
                      });
                    }
                  });
                }
              }
            } catch (e) {
              console.warn('Notification failed', e);
            }
          }
          try {
            if (sess?.connection) {
              (sess.connection as RTCPeerConnection).addEventListener(
                'track',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (ev2: any) => {
                  if (ev2.track?.kind === 'audio') {
                    const audio: HTMLAudioElement | null =
                      document.getElementById(
                        REMOTE_AUDIO_ELEMENT_ID
                      ) as HTMLAudioElement;
                    if (audio) audio.srcObject = ev2.streams[0];
                  }
                }
              );
            }
          } catch {
            // ignore
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
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Унифицированные хендлеры событий звонка
  private handleCallProgress(e: JsSIPSessionEvent) {
    console.log('Call is in progress', e);
    this.status = 'Ringing...';
    // Use outgoing ringtone while dialing
    if (this.incoming) {
      this.ringtone.startRingback(RINGBACK_DEFAULT_LEVEL, RINGTONE_SRC);
    } else {
      this.ringtone.startRingback(
        RINGBACK_DEFAULT_LEVEL,
        OUTGOING_RINGTONE_SRC
      );
    }
  }

  private handleCallConfirmed(e: JsSIPSessionEvent) {
    console.log('Call confirmed', e);
    this.status = 'Call in progress';
    this.callActive = true;
    this.startCallTimer();
    this.ringtone.stopRingback();
  }

  private handleCallEnded(e: JsSIPSessionEvent) {
    console.log('Call ended with cause:', e.data?.cause);
    // detect missed incoming calls (incoming shown but never answered)
    const wasMissed = this.incoming && !this.callActive;
    this.callActive = false;
    this.ringtone.stopRingback();
    this.stopCallTimer();
    this.onHold = false;
    // If missed, increment counter
    if (wasMissed) {
      try {
        this.missedCallCount = (this.missedCallCount || 0) + 1;
        localStorage.setItem('softphone.missedCount', String(this.missedCallCount));
      } catch {
        /* ignore */
      }
    }
    // Clear incoming state and session so UI resets when caller hangs up
    this.incoming = false;
    this.incomingFrom = null;
    this.currentSession = null;
    // play busy tone if ended due to busy or other error-like cause
    const causeStr = e.data?.cause ? String(e.data?.cause) : '';
    if (causeStr.toLowerCase().includes('busy') || causeStr === '486') {
      this.ringtone.playOneShot(BUSY_RINGTONE_SRC, 0.8, 1000);
    }
    this.status = this.isRegistered()
      ? 'Registered!'
      : `Call ended: ${e.data?.cause || 'Normal clearing'}`;
  }

  private handleCallFailed(e: JsSIPSessionEvent) {
    console.log('Call failed with cause:', e);
    this.callActive = false;
    this.stopCallTimer();
    // stop any ringback and play busy/error tone to signal failure
    this.ringtone.stopRingback();
    this.ringtone.playOneShot(BUSY_RINGTONE_SRC, 0.8, 1000);
    // Ensure incoming UI/state is cleared when call fails
    this.incoming = false;
    this.incomingFrom = null;
    this.currentSession = null;
    this.status = this.isRegistered()
      ? 'Registered!'
      : `Call failed: ${e.data?.cause || 'Unknown reason'}`;
  }

  registrationFailed(e: JsSIPRegisterEvent) {
    console.error('Registration failed:', e);
    this.status = 'Registration failed: ' + e.cause;
    // Log detailed error information
    this.ringtone.stopRingback();
    if (e.response) {
      console.error('SIP response:', e.response);
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
    this.callDuration = '00:00';
  }
  private updateDuration() {
    if (!this.callStart) return;
    const diff = Math.floor((Date.now() - this.callStart) / 1000);
    const mm = String(Math.floor(diff / 60)).padStart(2, '0');
    const ss = String(diff % 60).padStart(2, '0');
    this.callDuration = `${mm}:${ss}`;
  }

  connect() {
    if (!this.sipUser || !this.sipPassword) {
      this.status = 'Введите SIP логин и пароль';
      return;
    }

    // Проверяем доступ к микрофону перед подключением
    this.checkMicrophoneAccess();

    // Delegate to service to create and start UA
    this.status = 'Connecting...';
    this.softphone.connect(this.sipUser, this.sipPassword, this.asteriskHost);
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
    if (!this.incoming || !this.currentSession) return;
    try {
      this.softphone.answer(this.currentSession);
      this.incoming = false;
      this.status = 'Call answered';
      this.ringtone.stopRingback();
    } catch (err) {
      console.error('Answer failed', err);
      this.status = 'Answer failed';
    }
  }

  // User rejects the incoming call
  rejectIncoming() {
    if (!this.incoming || !this.currentSession) return;
    try {
      this.softphone.reject(this.currentSession);
      this.incoming = false;
      this.status = 'Call rejected';
      this.ringtone.stopRingback();
    } catch (err) {
      console.error('Reject failed', err);
      this.status = 'Reject failed';
    }
  }

  call() {
    if (!this.callee) {
      this.status = 'Введите номер абонента';
      return;
    }
    if (!this.softphone.isRegistered()) {
      this.status = 'Сначала необходимо подключиться';
      return;
    }

    this.status = `Calling ${this.callee}...`;
    try {
      const session = this.softphone.call(
        `sip:${this.callee}@${this.asteriskHost}`
      );
      this.currentSession = session;
      this.callActive = true;
      console.log('Call session created:', session);
    } catch (error) {
      console.error('Error initiating call:', error);
      this.status = 'Ошибка при совершении вызова';
    }
  }

  hangup() {
    this.softphone.hangup();
  }

  // Toggle local audio track enabled state
  toggleMute() {
    if (!this.callActive || !this.currentSession) return;
    try {
      const pc: RTCPeerConnection | undefined =
        this.currentSession['connection'];
      if (pc) {
        pc.getSenders()?.forEach((sender) => {
          if (sender.track && sender.track.kind === 'audio') {
            sender.track.enabled = this.muted; // if currently muted flag true -> enabling
          }
        });
      }
      this.muted = !this.muted;
      // After flipping flag, correct actual track state (above used previous value)
      if (pc) {
        pc.getSenders()?.forEach((sender) => {
          if (sender.track && sender.track.kind === 'audio')
            sender.track.enabled = !this.muted;
        });
      }
      this.status = this.muted ? 'Microphone muted' : 'Call in progress';
    } catch (e) {
      console.error('Mute toggle failed', e);
    }
  }

  // Hold / Unhold using JsSIP built-in re-INVITE logic
  toggleHold() {
    if (!this.callActive || !this.currentSession) return;
    if (this.holdInProgress) return;
    try {
      this.holdInProgress = true;
      const goingToHold = !this.onHold;
      if (goingToHold) {
        this.status = 'Placing on hold...';
        this.softphone.hold();
      } else {
        this.status = 'Resuming call...';
        this.softphone.unhold();
      }
    } catch (e) {
      console.error('Hold toggle failed', e);
      this.holdInProgress = false;
    }
  }

  // Метод для проверки доступа к микрофону
  checkMicrophoneAccess() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.microphoneError = false;
        // Освобождаем ресурсы после проверки
        stream.getTracks().forEach((track) => track.stop());
      })
      .catch((error) => {
        console.error('Microphone access denied:', error);
        this.microphoneError = true;
        this.status = 'Для звонков необходим доступ к микрофону';
      });
  }

  // Dial pad interactions
  pressKey(key: string) {
    if (/[0-9*#]/.test(key)) {
      if (this.callActive) {
        try {
          this.softphone.sendDTMF(key);
          this.dtmfSequence = (this.dtmfSequence + key).slice(-32); // keep last 32 keys
          this.status = `DTMF: ${key}`;
        } catch (e) {
          console.warn('DTMF send failed', e);
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
    if (this.callActive) return;
    const text = e.clipboardData?.getData('text') || '';
    if (!text) return;
    this.applyClipboardNumber(text);
    e.preventDefault();
  }


  // Initiate transfer via backend
  async transfer(type: 'blind' | 'attended' = 'blind') {
    if (!this.callActive) {
      this.status = 'No active call to transfer';
      return;
    }
    if (!this.transferTarget) {
      this.status = 'Enter transfer target (e.g. SIP/1000)';
      return;
    }
    try {
      this.status = 'Transferring...';
      await this.softphone.transfer(this.transferTarget, type);
    } catch (err) {
      console.error('Transfer request failed', err);
      this.status = 'Transfer request failed';
    }
  }

  private applyClipboardNumber(raw: string) {
    const cleaned = raw.replace(/[^0-9*#+]/g, '');
    if (!cleaned) return;
    this.callee = cleaned;
    this.status = `Number pasted (${cleaned.length} digits)`;
  }
}
