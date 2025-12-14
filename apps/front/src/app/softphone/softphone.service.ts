import { Injectable, inject } from '@angular/core';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Subject } from 'rxjs';
import * as JsSIP from 'jssip';
import { CallsApiService } from '../services/calls.service';

export type SoftphoneEvent = { type: string; payload?: any };

@Injectable({ providedIn: 'root' })
export class SoftphoneService {
  private ua: any = null;
  private currentSession: any = null;
  public events$ = new Subject<SoftphoneEvent>();
  private callsApi = inject(CallsApiService);

  connect(sipUser: string, sipPassword: string, asteriskHost = '127.0.0.1') {
    if (this.ua) {
      try { this.ua.stop(); } catch (err) { console.warn('ua.stop failed', err); }
      this.ua = null;
    }

    const socketWs = new (JsSIP as any).WebSocketInterface(`ws://${asteriskHost}:8089/ws`);
    socketWs.via_transport = 'WS';

    this.ua = new (JsSIP as any).UA({
      uri: `sip:${sipUser}@${asteriskHost}`,
      password: sipPassword,
      sockets: [socketWs],
      authorization_user: sipUser,
      connection_recovery_min_interval: 2,
      connection_recovery_max_interval: 30,
      realm: asteriskHost,
    });

    this.ua.on('registered', () => this.events$.next({ type: 'registered' }));
    this.ua.on('registrationFailed', (e: any) => this.events$.next({ type: 'registrationFailed', payload: e }));
    this.ua.on('connecting', (e: any) => this.events$.next({ type: 'connecting', payload: e }));
    this.ua.on('connected', (e: any) => this.events$.next({ type: 'connected', payload: e }));
    this.ua.on('disconnected', () => this.events$.next({ type: 'disconnected' }));

    this.ua.on('newRTCSession', (e: any) => {
      const session = e.session as any;
      this.attachSession(session);
      this.events$.next({ type: 'newRTCSession', payload: { session, direction: session.direction } });
    });

    try { this.ua.start(); } catch (err) { console.warn('UA start failed', err); }
    this.events$.next({ type: 'connecting' });
  }

  private attachSession(session: any) {
    this.currentSession = session;
    session.on('progress', (e: any) => this.events$.next({ type: 'progress', payload: e }));
    session.on('confirmed', (e: any) => this.events$.next({ type: 'confirmed', payload: e }));
    session.on('ended', (e: any) => this.events$.next({ type: 'ended', payload: e }));
    session.on('failed', (e: any) => this.events$.next({ type: 'failed', payload: e }));
    session.on('accepted', (e: any) => this.events$.next({ type: 'accepted', payload: e }));
    session.on('hold', () => this.events$.next({ type: 'hold' }));
    session.on('unhold', () => this.events$.next({ type: 'unhold' }));

    try {
      if (session.connection) {
        const pc = session.connection as RTCPeerConnection;
        pc.addEventListener('track', (ev: any) => {
          this.events$.next({ type: 'track', payload: ev });
        });
        // Diagnostic hooks: log ICE state changes and configuration
        try {
          pc.addEventListener('iceconnectionstatechange', () => {
            try { console.log('session PC iceConnectionState:', pc.iceConnectionState); } catch {}
          });
          try { console.log('session PC configuration:', pc.getConfiguration ? pc.getConfiguration() : undefined); } catch {}
        } catch (e) {
          console.warn('pc diagnostic hooks failed', e);
        }
      }
    } catch (err) {
      console.warn('attachSession track handler failed', err);
    }
  }

  /**
   * Answer an incoming call. If session is omitted, currentSession is used.
   */
  answer(session?: any, options?: any) {
    const s = session ?? this.currentSession;
    if (!s) throw new Error('No session to answer');
    const defaultOptions = {
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [],
        rtcpMuxPolicy: 'require'
      }
    };
    try {
      s.answer(options ?? defaultOptions);
      // re-attach to ensure events are bound
      this.attachSession(s);
      this.events$.next({ type: 'answered', payload: { session: s } });
      return s;
    } catch (err) {
      console.warn('answer failed', err);
      this.events$.next({ type: 'answerFailed', payload: err });
      throw err;
    }
  }

  /**
   * Reject/decline an incoming call. Uses terminate with status code when supported.
   */
  reject(session?: any, statusCode = 486) {
    const s = session ?? this.currentSession;
    if (!s) throw new Error('No session to reject');
    try {
      // JsSIP supports session.terminate with optional options
      s.terminate?.({ status_code: statusCode });
      this.events$.next({ type: 'rejected', payload: { session: s } });
    } catch (err) {
      console.warn('reject failed', err);
      this.events$.next({ type: 'rejectFailed', payload: err });
      throw err;
    }
  }

  isRegistered() {
    return !!this.ua && this.ua.isRegistered && this.ua.isRegistered();
  }

  call(target: string, options?: any) {
    if (!this.ua) throw new Error('UA not initialized');
    const defaultOptions = {
      mediaConstraints: { audio: true, video: false },
      extraHeaders: ['X-Custom-Header: CRM Call'],
      'pcConfig': {
        // Provide a default STUN server so the browser can gather srflx candidates
        // and ICE has a better chance to complete across NATs. For production
        // consider configuring a project TURN server and placing it in env.
        'iceServers': [],
        'rtcpMuxPolicy': 'require'
      }
    };
    const callOptions = options ?? defaultOptions;
    const session = this.ua.call(target, callOptions);
    this.attachSession(session);
    return session;
  }

  /**
   * Transfer the current call via backend API.
   * Returns whatever the backend returns.
   */
  async transfer(target: string, type: 'blind' | 'attended' = 'blind', channelId?: string) {
    if (!target) throw new Error('transfer target required');
    const id = channelId ?? (this.currentSession && (this.currentSession.id || this.currentSession.sessionId)) ?? null;
    try {
      const resp: any = await this.callsApi.transfer({ channelId: id, target, type }).toPromise();
      this.events$.next({ type: 'transferResult', payload: resp });
      return resp;
    } catch (err) {
      console.error('Transfer failed', err);
      this.events$.next({ type: 'transferFailed', payload: err });
      throw err;
    }
  }

  hangup() {
    try { this.currentSession?.terminate?.(); } catch (err) { console.warn('hangup failed', err); }
  }

  sendDTMF(digit: string) {
    try { this.currentSession?.sendDTMF?.(digit); } catch (err) { console.warn('sendDTMF failed', err); }
  }

  /**
   * Place the current session on hold. By default use re-INVITE (useUpdate=false)
   * as some SIP backends (e.g. Asterisk) may not handle UPDATE-based hold correctly.
   * Emit a local event immediately so UI updates without waiting for the remote/SDK event.
   */
  hold(useUpdate = false) {
    try {
      this.events$.next({ type: 'hold' });
      this.currentSession?.hold?.({ useUpdate });
    } catch (err) {
      console.warn('hold failed', err);
    }
  }

  /**
   * Resume the current session from hold. Defaults to re-INVITE.
   */
  unhold(useUpdate = false) {
    try {
      this.events$.next({ type: 'unhold' });
      this.currentSession?.unhold?.({ useUpdate });
    } catch (err) {
      console.warn('unhold failed', err);
    }
  }

  getCurrentSession() { return this.currentSession; }
}
