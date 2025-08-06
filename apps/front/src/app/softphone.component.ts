import { Component } from '@angular/core';
import * as JsSIP from 'jssip'; // Ensure JsSIP is available globally
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel

@Component({
  selector: 'app-softphone',
  templateUrl: './softphone.component.html',
  styleUrls: ['./softphone.component.scss'],
  imports: [FormsModule] // Import JsSIP if needed in the template
})
export class SoftphoneComponent {
  status = 'Disconnected';
  callActive = false;
  private ua: JsSIP.UA | null = null;
  private currentSession: any;

  // Новые переменные для ввода
  sipUser = 'webrtc_client3';
  sipPassword = 'webrtcpass3';
  callee = '';

  failed(e: any) {
    console.log('call failed with cause: ' + e.data.cause);
  }

  ended(e: any) {
    console.log('call ended with cause: ' + e.data.cause);
  }

  confirmed(e: any) {
    console.log('call confirmed', e);
  }

  progress(e: any) {
    console.log('call is in progress', e);
  }

  connect() {
    if (!this.sipUser || !this.sipPassword) {
      this.status = 'Введите SIP логин и пароль';
      return;
    }
    this.status = 'Connecting...';
    const socket = new JsSIP.WebSocketInterface('ws://localhost:8089/ws');

    this.ua = new JsSIP.UA({
      uri: `sip:${this.sipUser}@localhost`,
      password: this.sipPassword,
      sockets: [socket],
    });
    this.ua.on('registered', () => {
      this.status = 'Registered!';
    });
    this.ua.on('registrationFailed', (e: any) => {
      this.status = 'Registration failed: ' + e.cause;
    });
    this.ua.on('newRTCSession', (e: any) => {
      const session = e.session;
      if (session.direction === 'outgoing') {
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
        session.connection.addEventListener('track', (ev: any) => {
          if (ev.track.kind === 'audio') {
            const audio: HTMLAudioElement | null = document.getElementById('remoteAudio') as HTMLAudioElement;
            if (audio) audio.srcObject = ev.streams[0];
          }
        });
      }
    });
    this.ua.start();
  }

  call() {
    if (!this.callee) {
      this.status = 'Введите номер абонента';
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
      'mediaConstraints': { 'audio': true, 'video': true }
    };

    const session = this.ua?.call(`sip:${this.callee}@localhost`, options);
    this.currentSession = session;
    console.log(session);
  }

  hangup() {
    if (this.currentSession) this.currentSession.terminate();
  }
}