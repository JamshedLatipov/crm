import { Injectable, inject } from '@angular/core';
import { SoftphoneAudioService } from './softphone-audio.service';
import { SoftphoneLoggerService } from './softphone-logger.service';
import { REMOTE_AUDIO_ELEMENT_ID } from './ringtone.service';

@Injectable({ providedIn: 'root' })
export class SoftphoneMediaService {
  private logger = inject(SoftphoneLoggerService);
  private audioSvc = inject(SoftphoneAudioService);

  private currentSession: any = null;
  private preHoldMuted: boolean | null = null;

  setSession(session: any) {
    this.currentSession = session;
    // Attach PC track handlers and receivers when a session is provided
    try {
      const pc: RTCPeerConnection | undefined = session?.connection;
      if (pc) {
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
          try {
            this.audioSvc.attachReceiversFromPC(pc);
          } catch (e) {
            this.logger.warn('audioSvc attachReceiversFromPC failed', e);
          }
        } catch (e) {
          this.logger.warn('attachReceiversFromPC wrapper failed', e);
        }

        try {
          this.audioSvc.initAudioElement(REMOTE_AUDIO_ELEMENT_ID);
        } catch (e) {
          this.logger.warn('initAudioElement failed', e);
        }
      }
    } catch (e) {
      this.logger.warn('setSession attach handlers failed', e);
    }
  }

  clearSession() {
    this.currentSession = null;
    this.preHoldMuted = null;
  }

  // Toggle local audio (mute/unmute) by manipulating RTCPeerConnection senders.
  // Returns the new muted state (true = muted).
  toggleMute(): boolean {
    try {
      const pc: RTCPeerConnection | undefined = this.currentSession?.connection;
      let newMuted = true;
      if (pc) {
        // determine current muted state by inspecting first audio sender
        let currentMuted = true;
        try {
          const senders = pc.getSenders?.() ?? [];
          for (const s of senders) {
            if (s.track && s.track.kind === 'audio') {
              currentMuted = !s.track.enabled;
              break;
            }
          }
          newMuted = !currentMuted;
          senders.forEach((sender) => {
            if (sender.track && sender.track.kind === 'audio') {
              try {
                sender.track.enabled = !newMuted;
              } catch (e) {
                // best-effort
              }
            }
          });
        } catch (e) {
          this.logger.warn('toggleMute: manipulating senders failed', e);
        }
      } else {
        // no peer connection, just flip to muted by default
        newMuted = true;
      }
      return newMuted;
    } catch (e) {
      this.logger.warn('toggleMute failed', e);
      return true;
    }
  }

  // Apply hold/unhold behavior. Returns the muted state that should be set
  // by the caller (true = muted).
  applyHoldState(hold: boolean): boolean {
    try {
      const pc: RTCPeerConnection | undefined = this.currentSession?.connection;

      if (hold) {
        // infer current muted state from senders and store it
        try {
          const s = pc?.getSenders?.() ?? [];
          let inferredMuted = false;
          for (const snd of s) {
            if (snd.track && snd.track.kind === 'audio') {
              inferredMuted = !snd.track.enabled;
              break;
            }
          }
          this.preHoldMuted = inferredMuted;
        } catch (e) {
          this.preHoldMuted = null;
        }
      }

      // Disable or enable local audio senders
      try {
        if (pc) {
          pc.getSenders()?.forEach((sender) => {
            if (sender.track && sender.track.kind === 'audio') {
              try {
                sender.track.enabled = !hold;
              } catch (e) {
                // ignore
              }
            }
          });
        }
      } catch (e) {
        this.logger.warn('applyHoldState: manipulating senders failed', e);
      }

      // Mute or restore remote audio element to avoid hearing hold music/tones locally
      try {
        const audio = document.getElementById(
          REMOTE_AUDIO_ELEMENT_ID
        ) as HTMLAudioElement | null;
        if (audio) {
          if (hold) {
            try {
              (audio as any).dataset.__preHoldVolume = String(audio.volume ?? 1);
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
            try {
              const p = audio.play();
              if (p && typeof (p as any).then === 'function') (p as Promise<void>).catch(() => {});
            } catch {}
          }
        }
      } catch (e) {
        this.logger.warn('applyHoldState: remote audio handling failed', e);
      }

      if (hold) {
        return true;
      }

      // on unhold, restore previous muted state if known
      const restored = this.preHoldMuted ?? false;
      this.preHoldMuted = null;
      return restored;
    } catch (e) {
      this.logger.warn('applyHoldState failed', e);
      return true;
    }
  }
}
