import { Component } from '@angular/core';
import * as JsSIP from 'jssip'; // Ensure JsSIP is available globally
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel
import { CommonModule } from '@angular/common'; // Import CommonModule for *ngIf
import { MatIconModule } from '@angular/material/icon'; // Import MatIconModule for icons

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
interface JsSIPSession {
  direction?: string;
  connection?: RTCPeerConnection;
  on(event: string, callback: () => void): void;
  terminate(): void;
}

@Component({
  selector: 'app-softphone',
  templateUrl: './softphone.component.html',
  styleUrls: ['./softphone.component.scss'],
  imports: [FormsModule, CommonModule, MatIconModule]
})
export class SoftphoneComponent {
  status = 'Disconnected';
  callActive = false;
  microphoneError = false;
  private ua: JsSIP.UA | null = null;
  private currentSession: JsSIPSession | null = null;

  // Новые переменные для ввода
  sipUser = 'operator1';
  sipPassword = 'pass1';
  callee = '';

  // Переменная для IP-адреса сервера Asterisk
  private readonly asteriskHost = '127.0.0.1';
  
  failed(e: JsSIPSessionEvent) {
    console.log('Call failed with cause:', e);
    this.status = `Call failed: ${e.data?.cause || 'Unknown reason'}`;
    this.callActive = false;
  }

  ended(e: JsSIPSessionEvent) {
    console.log('Call ended with cause:', e.data?.cause);
    this.status = `Call ended: ${e.data?.cause || 'Normal clearing'}`;
    this.callActive = false;
  }

  confirmed(e: JsSIPSessionEvent) {
    console.log('Call confirmed', e);
    this.status = 'Call in progress';
    this.callActive = true;
  }

  progress(e: JsSIPSessionEvent) {
    console.log('Call is in progress', e);
    this.status = 'Ringing...';
  }

  registrationFailed(e: JsSIPRegisterEvent) {
    console.error('Registration failed:', e);
    this.status = 'Registration failed: ' + e.cause;
    // Log detailed error information
    if (e.response) {
      console.error('SIP response:', e.response);
    }
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

    // Включаем подробное логирование JsSIP
    JsSIP.debug.enable('JsSIP:*');
    console.log('Enabling detailed JsSIP logging');

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
      realm: 'crm.local'
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
      this.status = 'Disconnected, reconnecting...';
    });

    // Добавляем дополнительные обработчики для более информативного логирования
    if (this.ua) {
      this.ua.on('connecting', (event) => {
        console.log('Connecting event with attempts:', event.attempts);
        this.status = `Connecting (attempt ${event.attempts})...`;
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
      // Используем приведение типа к нашему интерфейсу
      const session = e.session as JsSIPSession;
      if (session && session.direction === 'outgoing') {
        this.currentSession = session;
        session.on('accepted', () => {
          this.status = 'Call accepted';
          this.callActive = true;
        });
        session.on('ended', () => {
          this.status = 'Call ended';
          this.callActive = false;
        });
        session.on('failed', () => {
          this.status = 'Call failed';
          this.callActive = false;
        });
        if (session.connection) {
          session.connection.addEventListener('track', (ev: RTCTrackEvent) => {
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
      'progress': this.progress.bind(this),
      'failed': this.failed.bind(this),
      'ended': this.ended.bind(this),
      'confirmed': this.confirmed.bind(this)
    };

    const options = {
      'eventHandlers': eventHandlers,
      'mediaConstraints': { 'audio': true, 'video': false }, // Use video: false for audio-only calls
      'extraHeaders': ['X-Custom-Header: CRM Call'],
      'pcConfig': {
        'iceServers': [
          {
            'urls': [
              `stun:${this.asteriskHost}:3478`
            ]
          },
          {
            'urls': [
              `turn:${this.asteriskHost}:3478?transport=udp`,
              `turn:${this.asteriskHost}:3478?transport=tcp`
            ],
            'username': 'webrtc',
            'credential': 'webrtcpass'
          }
        ],
        'rtcpMuxPolicy': 'require' as const // Enable RTCP multiplexing for Chrome
      }
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
      this.currentSession.terminate();
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
}