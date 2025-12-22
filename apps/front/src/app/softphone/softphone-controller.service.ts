import { Injectable, inject } from '@angular/core';
import { SoftphoneService } from './softphone.service';
import { SoftphoneMediaService } from './softphone-media.service';
import { SoftphoneLoggerService } from './softphone-logger.service';
import { RingtoneService, OUTGOING_RINGTONE_SRC, RINGBACK_DEFAULT_LEVEL } from './ringtone.service';
import { SoftphoneCallHistoryService } from './services/softphone-call-history.service';
import { generateClientCallId } from './softphone.helpers';

@Injectable({ providedIn: 'root' })
export class SoftphoneControllerService {
  private softphone = inject(SoftphoneService);
  private media = inject(SoftphoneMediaService);
  private logger = inject(SoftphoneLoggerService);
  private ringtone = inject(RingtoneService);
  private callHistory = inject(SoftphoneCallHistoryService);

  constructor() {}

  // Place an outgoing call and return the session object (or null on error)
  call(target: string, opts: any) {
    try {
      const clientCallId = generateClientCallId();
      const headers = (opts?.extraHeaders || []).slice();
      headers.push(`X-Client-Call-ID: ${clientCallId}`);
      const callOpts = { ...opts, extraHeaders: headers };

      const session = this.softphone.call(target, callOpts);
      try {
        (session as any).__clientCallId = clientCallId;
      } catch {}

      // attach media handling
      try {
        this.media.setSession(session);
      } catch (e) {
        this.logger.warn('media.setSession after call failed', e);
      }

      // start ringback (UI-level ringback handled elsewhere but keep fallback)
      try {
        this.ringtone.startRingback(RINGBACK_DEFAULT_LEVEL, OUTGOING_RINGTONE_SRC);
      } catch (e) {
        /* ignore */
      }

      return session;
    } catch (e) {
      this.logger.error('Call failed in controller', e);
      return null;
    }
  }

  hangup() {
    try {
      this.softphone.hangup();
    } catch (e) {
      this.logger.warn('hangup failed', e);
    }
  }

  async transfer(target: string, type: 'blind' | 'attended' = 'blind') {
    try {
      await this.softphone.transfer(target, type);
    } catch (e) {
      this.logger.error('transfer failed', e);
      throw e;
    }
  }

  sendDTMF(key: string) {
    try {
      this.softphone.sendDTMF(key);
    } catch (e) {
      this.logger.warn('sendDTMF failed', e);
    }
  }

  // Place local session on hold via softphone (which triggers re-INVITE) and
  // apply local media changes via media service.
  hold() {
    try {
      this.softphone.hold();
      // apply local hold-side effects
      try {
        this.media.applyHoldState(true);
      } catch (e) {
        this.logger.warn('media.applyHoldState(true) failed', e);
      }
    } catch (e) {
      this.logger.warn('hold() failed', e);
    }
  }

  unhold() {
    try {
      this.softphone.unhold();
      // apply local resume-side effects
      try {
        this.media.applyHoldState(false);
      } catch (e) {
        this.logger.warn('media.applyHoldState(false) failed', e);
      }
    } catch (e) {
      this.logger.warn('unhold() failed', e);
    }
  }

  answer(session: any) {
    try {
      this.softphone.answer(session);
      // attach session media
      try {
        this.media.setSession(session);
      } catch (e) {
        this.logger.warn('media.setSession after answer failed', e);
      }
      try {
        this.ringtone.stopRingback();
      } catch {}
    } catch (e) {
      this.logger.error('answer failed', e);
    }
  }

  reject(session: any) {
    try {
      this.softphone.reject(session);
      try {
        this.ringtone.stopRingback();
      } catch {}
    } catch (e) {
      this.logger.warn('reject failed', e);
    }
  }

  // Manual register call helper delegating to call history service
  async manualRegisterCall(callId: string | null, payload: { note?: string; callType?: string | null; scriptBranch?: string | null }) {
    try {
      await this.callHistory.saveCallLog(callId, {
        note: payload.note,
        callType: payload.callType,
        scriptBranch: payload.scriptBranch,
      });
      this.logger.info('Manual CDR registered (controller)');
    } catch (e) {
      this.logger.warn('Manual CDR registration failed', e);
      throw e;
    }
  }
}
