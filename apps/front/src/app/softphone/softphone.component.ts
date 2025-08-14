import { Component, OnInit, HostListener } from '@angular/core';
import * as JsSIP from 'jssip'; // Ensure JsSIP is available globally
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel
import { CommonModule } from '@angular/common'; // Import CommonModule for *ngIf
import { MatIconModule } from '@angular/material/icon'; // Import MatIconModule for icons
import { 
  SoftphoneStatusBarComponent,
  SoftphoneLoginFormComponent,
  SoftphoneCallInfoComponent,
  SoftphoneCallActionsComponent,
  SoftphoneScriptsPanelComponent
} from './components';

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

interface JsSIPRTCSessionEvent {
  session: unknown;
  request?: unknown;
  originator?: string;
}

// Типизируем объект сессии для предотвращения ошибок "any"
// Minimal surface of JsSIP RTCSession we need; loosen types to avoid incompat issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface JsSIPSession { [key: string]: any; }

@Component({
  selector: 'app-softphone',
  templateUrl: './softphone.component.html',
  styleUrls: ['./softphone.component.scss'],
  imports: [FormsModule, CommonModule, MatIconModule,
    SoftphoneStatusBarComponent,
    SoftphoneCallInfoComponent,
    SoftphoneCallActionsComponent,
    SoftphoneScriptsPanelComponent
  ]
})
export class SoftphoneComponent implements OnInit {
  status = 'Disconnected';
  callActive = false;
  muted = false;
  onHold = false;
  holdInProgress = false;
  microphoneError = false;
  private ua: JsSIP.UA | null = null;
  private currentSession: JsSIPSession | null = null;
  // Таймер звонка
  private callStart: number | null = null;
  callDuration = '00:00';
  private durationTimer: number | null = null;

  // Новые переменные для ввода
  sipUser = 'operator1';
  sipPassword = 'pass1';
  callee = '';
  // Simple stats placeholders (could be wired to backend later)
  callsProcessedToday = 12;
  callsInQueue = 42;

  // Переменная для IP-адреса сервера Asterisk
  private readonly asteriskHost = '127.0.0.1';

  private autoConnectAttempted = false;

  constructor() {
    // Полное отключение глобального debug-логирования JsSIP
    try {
      // Удаляем сохраненный namespace debug (если библиотека использует localStorage)
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('debug');
      }
      // Пытаемся вызвать стандартный метод отключения
      if (JsSIP.debug && typeof JsSIP.debug.disable === 'function') {
        JsSIP.debug.disable();
      } else if (JsSIP.debug && typeof JsSIP.debug.enable === 'function') {
        // Установка пустой строки обычно отключает вывод (debug npm пакет)
        JsSIP.debug.enable('');
      }
    } catch {
      // игнорируем любые ошибки (например, доступ к localStorage в некоторых окружениях)
    }

    // Автоподстановка сохранённых SIP реквизитов оператора
    try {
      const savedUser = localStorage.getItem('operator.username');
      const savedPass = localStorage.getItem('operator.password');
      if (savedUser) this.sipUser = savedUser;
      if (savedPass) this.sipPassword = savedPass;
    } catch { /* ignore */ }
  }

  ngOnInit() {
    // Авто-SIP авторизация, если есть сохранённые данные и ещё не подключено
    if (!this.autoConnectAttempted && this.sipUser && this.sipPassword) {
      this.autoConnectAttempted = true;
      // Небольшая задержка чтобы DOM стабилизировался (иногда полезно для JsSIP)
      setTimeout(() => {
        if (!this.ua || !this.ua.isRegistered()) {
          this.connect();
        }
      }, 50);
    }
  }
  
  // Унифицированные хендлеры событий звонка
  private handleCallProgress(e: JsSIPSessionEvent) {
    console.log('Call is in progress', e);
    this.status = 'Ringing...';
  }
  private handleCallConfirmed(e: JsSIPSessionEvent) {
    console.log('Call confirmed', e);
    this.status = 'Call in progress';
    this.callActive = true;
    this.startCallTimer();
  }
  private handleCallEnded(e: JsSIPSessionEvent) {
    console.log('Call ended with cause:', e.data?.cause);
    this.callActive = false;
    this.stopCallTimer();
  this.onHold = false;
    this.status = this.isRegistered() ? 'Registered!' : `Call ended: ${e.data?.cause || 'Normal clearing'}`;
  }
  private handleCallFailed(e: JsSIPSessionEvent) {
    console.log('Call failed with cause:', e);
    this.callActive = false;
    this.stopCallTimer();
    this.status = this.isRegistered() ? 'Registered!' : `Call failed: ${e.data?.cause || 'Unknown reason'}`;
  }

  registrationFailed(e: JsSIPRegisterEvent) {
    console.error('Registration failed:', e);
    this.status = 'Registration failed: ' + e.cause;
    // Log detailed error information
    if (e.response) {
      console.error('SIP response:', e.response);
    }
  }

  private isRegistered(): boolean {
    return !!this.ua && this.ua.isRegistered();
  }

  private startCallTimer() {
    this.callStart = Date.now();
    this.updateDuration();
    this.durationTimer = setInterval(() => this.updateDuration(), 1000);
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

    // Если соединение уже установлено, сначала разрываем его
    if (this.ua) {
      this.ua.stop();
      this.ua = null;
    }

    this.status = 'Connecting...';

    // Пытаемся сначала использовать WSS, если не получится - используем WS
    const socketWs = new JsSIP.WebSocketInterface(`ws://${this.asteriskHost}:8089/ws`);

    // Задаем правильный транспорт для WebSocket
    socketWs.via_transport = 'WS';

    // Создаем UA с обоими сокетами - сначала пробует WSS, если не получится - переключится на WS
    this.ua = new JsSIP.UA({
      uri: `sip:${this.sipUser}@${this.asteriskHost}`,
      password: this.sipPassword,
      sockets: [ socketWs], // Пробуем оба транспорта
      authorization_user: this.sipUser, // Указываем явно имя пользователя для авторизации
      connection_recovery_min_interval: 2, // Быстрое восстановление соединения
      connection_recovery_max_interval: 30,
      realm: this.asteriskHost
    });
    this.ua.on('registered', () => {
      this.status = 'Registered!';
    });

    this.ua.on('registrationFailed', (e: JsSIPRegisterEvent) => {
      console.error('Registration failed:', e);
      this.status = 'Registration failed: ' + e.cause;
      // Log detailed error information
      if (e.response) {
        console.error('SIP response:', e.response);
      }
    });

    this.ua.on('connecting', () => {
      this.status = 'Connecting...';
    });

    this.ua.on('connected', () => {
      this.status = 'Connected, registering...';
    });

    this.ua.on('disconnected', () => {
      this.status = 'Disconnected';
    });

    // Добавляем дополнительные обработчики для более информативного логирования
    if (this.ua) {
      this.ua.on('connecting', (event) => {
        console.log('Connecting event with attempts:', event.attempts);
        this.status = event.attempts ? `Connecting (attempt ${event.attempts})...` : 'Connecting...';
      });

      this.ua.on('connected', (event) => {
        console.log('Connected event details:', event);
        this.status = `Connected, registering...`;
      });

      // Добавляем обработчик для отладки входящих и исходящих сообщений
      // @ts-expect-error - newMessage не типизирован в стандартной библиотеке JsSIP
      this.ua.on('newMessage', (event) => {
        console.log('New SIP message:', event);
      });
    }

    // Отключаем проверку WebSocket TLS для отладки
    // Создаем специальный обработчик для JsSIP.WebSocket в браузере
    // Перехватываем отображение ошибок в консоли

    // Примечание: событие transportError не поддерживается в текущей версии JsSIP
    this.ua.on('newRTCSession', (e: JsSIPRTCSessionEvent) => {
      const session = e.session as unknown as JsSIPSession;
      if (session && session['direction'] === 'outgoing') {
        this.currentSession = session;
        session['on']('accepted', () => {
          this.status = 'Call accepted';
          this.callActive = true;
          this.startCallTimer();
        });
        // Handle hold/unhold events (JsSIP emits 'hold'/'unhold')
        session['on']('hold', () => {
          this.onHold = true;
          this.holdInProgress = false;
          this.status = 'Call on hold';
        });
        session['on']('unhold', () => {
          this.onHold = false;
          this.holdInProgress = false;
          this.status = 'Call in progress';
        });
        session['on']('ended', () => this.handleCallEnded({ data: { cause: 'Normal clearing' } }));
        session['on']('failed', () => this.handleCallFailed({ data: { cause: 'Failed' } }));
        if (session['connection']) {
          (session['connection'] as RTCPeerConnection).addEventListener('track', (ev: RTCTrackEvent) => {
            if (ev.track.kind === 'audio') {
              const audio: HTMLAudioElement | null = document.getElementById('remoteAudio') as HTMLAudioElement;
              if (audio) audio.srcObject = ev.streams[0];
            }
          });
        }
      }
    });
    this.ua.start();
  }

  call() {
    if (!this.callee) {
      this.status = 'Введите номер абонента';
      return;
    }
    if (!this.ua || !this.ua.isRegistered()) {
      this.status = 'Сначала необходимо подключиться';
      return;
    }

    this.status = `Calling ${this.callee}...`;
    const eventHandlers = {
      progress: this.handleCallProgress.bind(this),
      failed: this.handleCallFailed.bind(this),
      ended: this.handleCallEnded.bind(this),
      confirmed: this.handleCallConfirmed.bind(this)
    };

    const options = {
      'eventHandlers': eventHandlers,
      'mediaConstraints': { 'audio': true, 'video': false }, // Use video: false for audio-only calls
      'extraHeaders': ['X-Custom-Header: CRM Call'],
      // 'pcConfig': {
      //   'iceServers': [
      //     {
      //       'urls': [
      //         `stun:${this.asteriskHost}:3478`
      //       ]
      //     },
      //     {
      //       'urls': [
      //         `turn:${this.asteriskHost}:3478?transport=udp`,
      //         `turn:${this.asteriskHost}:3478?transport=tcp`
      //       ],
      //       'username': 'webrtc',
      //       'credential': 'webrtcpass'
      //     }
      //   ],
      //   'rtcpMuxPolicy': 'require' as const // Enable RTCP multiplexing for Chrome
      // }
    };

    try {
      // TypeScript safety: мы уже проверили, что this.ua не null выше, но добавим проверку
      if (this.ua) {
        const session = this.ua.call(`sip:${this.callee}@${this.asteriskHost}`, options);
        this.currentSession = session;
        this.callActive = true;
  console.log('Call session created:', session);
      } else {
        throw new Error('UA is not initialized');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      this.status = 'Ошибка при совершении вызова';
    }
  }

  hangup() {
    if (this.currentSession) {
      this.currentSession['terminate']?.();
    }
  }

  // Toggle local audio track enabled state
  toggleMute() {
    if (!this.callActive || !this.currentSession) return;
    try {
  const pc: RTCPeerConnection | undefined = this.currentSession['connection'];
      if (pc) {
        pc.getSenders()?.forEach(sender => {
          if (sender.track && sender.track.kind === 'audio') {
            sender.track.enabled = this.muted; // if currently muted flag true -> enabling
          }
        });
      }
      this.muted = !this.muted;
      // After flipping flag, correct actual track state (above used previous value)
      if (pc) {
        pc.getSenders()?.forEach(sender => {
          if (sender.track && sender.track.kind === 'audio') sender.track.enabled = !this.muted;
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
        this.currentSession['hold']?.({ useUpdate: true });
      } else {
        this.status = 'Resuming call...';
        this.currentSession['unhold']?.({ useUpdate: true });
      }
    } catch (e) {
      console.error('Hold toggle failed', e);
      this.holdInProgress = false;
    }
  }

  // Метод для проверки доступа к микрофону
  checkMicrophoneAccess() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        this.microphoneError = false;
        // Освобождаем ресурсы после проверки
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(error => {
        console.error('Microphone access denied:', error);
        this.microphoneError = true;
        this.status = 'Для звонков необходим доступ к микрофону';
      });
  }

  // Dial pad interactions
  pressKey(key: string) {
    if (this.callActive && this.currentSession && typeof this.currentSession['sendDTMF'] === 'function' && /[0-9*#]/.test(key)) {
      try { this.currentSession['sendDTMF'](key); } catch (e) { console.warn('DTMF send failed', e); }
    }
    this.callee += key;
  }
  clearNumber() { this.callee = ''; }
  removeLast() { this.callee = this.callee.slice(0, -1); }

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

  private applyClipboardNumber(raw: string) {
    const cleaned = raw.replace(/[^0-9*#+]/g, '');
    if (!cleaned) return;
    this.callee = cleaned;
    this.status = `Number pasted (${cleaned.length} digits)`;
  }
}