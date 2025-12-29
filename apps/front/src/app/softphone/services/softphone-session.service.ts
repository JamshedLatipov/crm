import { Injectable } from '@angular/core';
import { SoftphoneLoggerService } from '../softphone-logger.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsSIPSession = any;

/**
 * Service for session-related utilities (call ID generation, clipboard handling)
 */
@Injectable({ providedIn: 'root' })
export class SoftphoneSessionService {
  constructor(private logger: SoftphoneLoggerService) {}

  /**
   * Generate a lightweight client-side id to correlate frontend logs with Asterisk
   */
  generateClientCallId(): string {
    return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Extract an identifier to use when saving call logs.
   * Prefer client-generated id (attached to session), fall back to session id or call_id.
   */
  getSessionCallKey(session: JsSIPSession | null): string | null {
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

  /**
   * Extract phone number from string (continuous digits with optional leading +)
   */
  extractNumber(s: string): string {
    if (!s) return '';
    const m = s.match(/\+?\d+/g);
    if (!m) return s.replace(/\D/g, '');
    return m.join('');
  }

  /**
   * Extract phone number from clipboard text
   */
  extractNumberFromClipboard(raw: string): string {
    return raw.replace(/[^0-9*#+]/g, '');
  }

  /**
   * Apply hold state locally: disable outgoing audio senders and pause/resume remote audio playback
   */
  applyHoldState(
    session: JsSIPSession | null,
    hold: boolean,
    remoteAudioElementId: string,
    onMutedChange: (muted: boolean) => void
  ) {
    try {
      const pc: RTCPeerConnection | undefined = session?.connection;

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

      // Update muted state via callback
      onMutedChange(hold);

      // Mute or restore remote audio element to avoid hearing hold music/tones locally
      try {
        const audio = document.getElementById(
          remoteAudioElementId
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
