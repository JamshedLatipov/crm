import { Component } from '@angular/core';
import * as JsSIP from 'jssip'; // Ensure JsSIP is available globally

@Component({
  selector: 'app-softphone',
  templateUrl: './softphone.component.html',
  styleUrls: ['./softphone.component.scss']
})
export class SoftphoneComponent {
  status = 'Disconnected';
  callActive = false;
  private ua: any;
  private currentSession: any;

  connect() {
    this.status = 'Connecting...';
    const socket = new JsSIP.WebSocketInterface('wss://localhost:8089/ws');

    this.ua = new JsSIP.UA({
      uri: 'sip:webrtc_client@localhost',
      password: 'webrtcpass',
      sockets: [socket],
      registrar_server: 'sip:localhost',
      session_timers: false
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
    this.status = 'Calling 1000...';
    this.ua.call('sip:1000@localhost', {
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: { offerToReceiveAudio: 1, offerToReceiveVideo: 0 }
    });
  }

  hangup() {
    if (this.currentSession) this.currentSession.terminate();
  }
}
