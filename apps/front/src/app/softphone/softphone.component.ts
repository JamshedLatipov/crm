import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CallsApiService } from '../calls/calls.service';
import { SoftphoneService } from './softphone.service';
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
export class SoftphoneComponent implements OnInit {
  status = 'Disconnected';
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
  private ringbackCtx: AudioContext | null = null;
  private ringbackOsc: OscillatorNode | null = null;
  private ringbackGain: GainNode | null = null;
  private ringbackTimer: number | null = null;

  // Новые переменные для ввода
  sipUser = 'operator1';
  sipPassword = 'pass1';
  callee = '';
  // Simple stats placeholders (could be wired to backend later)
  callsProcessedToday = 12;
  callsInQueue = 42;
  // Sequence of DTMF sent during active call (for user feedback)
  dtmfSequence = '';
  // Transfer UI
  transferTarget = '';

  // Переменная для IP-адреса сервера Asterisk
  private readonly asteriskHost = '127.0.0.1';

  private autoConnectAttempted = false;
  // inject calls API
  private callsApi = inject(CallsApiService);
  // inject softphone service
  private softphone = inject(SoftphoneService);
  // UI tab state
  activeTab: 'dial' | 'history' = 'dial';

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

  ngOnInit() {
    // Subscribe to softphone events coming from the service
    this.softphone.events$.subscribe((ev) => {
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
          this.status = ev.payload?.ok ? 'Transfer initiated' : 'Transfer result: ' + (ev.payload?.error || 'unknown');
          break;
        case 'transferFailed':
          this.status = 'Transfer failed';
          break;
        case 'newRTCSession': {
          const sess = ev.payload?.session as JsSIPSession;
          this.currentSession = sess;
          try {
            if (sess?.connection) {
              (sess.connection as RTCPeerConnection).addEventListener(
                'track',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (ev2: any) => {
                  if (ev2.track?.kind === 'audio') {
                    const audio: HTMLAudioElement | null =
                      document.getElementById(
                        'remoteAudio'
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

  // Унифицированные хендлеры событий звонка
  private handleCallProgress(e: JsSIPSessionEvent) {
    console.log('Call is in progress', e);
    this.status = 'Ringing...';
    this.startRingback();
  }

  private handleCallConfirmed(e: JsSIPSessionEvent) {
    console.log('Call confirmed', e);
    this.status = 'Call in progress';
    this.callActive = true;
    this.startCallTimer();
    this.stopRingback();
  }

  private handleCallEnded(e: JsSIPSessionEvent) {
    console.log('Call ended with cause:', e.data?.cause);
    this.callActive = false;
    this.stopRingback();
    this.stopCallTimer();
    this.onHold = false;
    this.status = this.isRegistered()
      ? 'Registered!'
      : `Call ended: ${e.data?.cause || 'Normal clearing'}`;
  }

  private handleCallFailed(e: JsSIPSessionEvent) {
    console.log('Call failed with cause:', e);
    this.callActive = false;
    this.stopCallTimer();
    this.status = this.isRegistered()
      ? 'Registered!'
      : `Call failed: ${e.data?.cause || 'Unknown reason'}`;
    this.stopRingback();
  }

  registrationFailed(e: JsSIPRegisterEvent) {
    console.error('Registration failed:', e);
    this.status = 'Registration failed: ' + e.cause;
    // Log detailed error information
    this.stopRingback();
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

  private startRingback() {
    try {
      if (this.ringbackCtx) return; // already playing
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 400; // ringback-ish
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.ringbackCtx = ctx;
      this.ringbackOsc = osc;
      this.ringbackGain = gain;

      // Simple on/off pattern: 1000ms on, 4000ms off (approx typical ringback)
      const playPulse = () => {
        if (!this.ringbackGain || !this.ringbackCtx) return;
        this.ringbackGain.gain.cancelScheduledValues(
          this.ringbackCtx.currentTime
        );
        this.ringbackGain.gain.setValueAtTime(
          0.0001,
          this.ringbackCtx.currentTime
        );
        this.ringbackGain.gain.linearRampToValueAtTime(
          0.18,
          this.ringbackCtx.currentTime + 0.01
        );
        // fade out after 1s
        this.ringbackGain.gain.linearRampToValueAtTime(
          0.0001,
          this.ringbackCtx.currentTime + 1.0
        );
      };
      playPulse();
      this.ringbackTimer = window.setInterval(playPulse, 4000);
    } catch (err) {
      console.warn('Ringback start failed', err);
    }
  }

  private stopRingback() {
    try {
      if (this.ringbackTimer) {
        clearInterval(this.ringbackTimer);
        this.ringbackTimer = null;
      }
      if (this.ringbackOsc) {
        try {
          this.ringbackOsc.stop();
        } catch (err) {
          console.warn('ringbackOsc.stop failed', err);
        }
        try {
          this.ringbackOsc.disconnect();
        } catch (err) {
          console.warn('ringbackOsc.disconnect failed', err);
        }
        this.ringbackOsc = null;
      }
      if (this.ringbackGain) {
        try {
          this.ringbackGain.disconnect();
        } catch (err) {
          console.warn('ringbackGain.disconnect failed', err);
        }
        this.ringbackGain = null;
      }
      if (this.ringbackCtx) {
        try {
          this.ringbackCtx.close();
        } catch (err) {
          console.warn('ringbackCtx.close failed', err);
        }
        this.ringbackCtx = null;
      }
    } catch (err) {
      console.warn('Ringback stop failed', err);
    }
  }
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
      const session = this.softphone.call(`sip:${this.callee}@${this.asteriskHost}`);
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

  async pasteFromClipboard() {
    if (!navigator.clipboard) return;
    try {
      const text = await navigator.clipboard.readText();
      this.applyClipboardNumber(text);
    } catch (err) {
      console.warn('Clipboard read failed', err);
    }
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
