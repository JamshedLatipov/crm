import { Injectable } from '@angular/core';

// Sound constants (public path)
export const RINGTONE_SRC = '/sounds/ring.mp3'; // incoming
export const OUTGOING_RINGTONE_SRC = '/sounds/ring-calling.mp3'; // outgoing
export const BUSY_RINGTONE_SRC = '/sounds/busy.mp3';
export const RINGTONE_ELEMENT_ID = 'ringtoneAudio';
export const REMOTE_AUDIO_ELEMENT_ID = 'remoteAudio';
export const RINGBACK_DEFAULT_LEVEL = 0.18;
export const RINGBACK_INCOMING_LEVEL = 0.6;

@Injectable({ providedIn: 'root' })
export class RingtoneService {
  private ringbackCtx: AudioContext | null = null;
  private ringbackOsc: OscillatorNode | null = null;
  private ringbackGain: GainNode | null = null;
  private ringbackTimer: number | null = null;

  private busyAudioEl: HTMLAudioElement | null = null;

  startRingback(level = RINGBACK_DEFAULT_LEVEL, src?: string) {
    try {
      const ringtoneEl = document.getElementById(RINGTONE_ELEMENT_ID) as HTMLAudioElement | null;
      const ringtoneSrcToUse = src ?? RINGTONE_SRC;
      if (ringtoneEl) {
        try {
          if (!ringtoneEl.src || !ringtoneEl.src.includes(ringtoneSrcToUse)) {
            ringtoneEl.src = ringtoneSrcToUse;
          }
          ringtoneEl.volume = Math.min(1, level);
          ringtoneEl.currentTime = 0;
          const playPromise = ringtoneEl.play();
          if (playPromise && typeof (playPromise as unknown as { then?: unknown }).then === 'function') {
            (playPromise as Promise<void>)
              .then(() => {
                try {
                  (ringtoneEl as HTMLAudioElement & { __playingForSoftphone?: boolean }).__playingForSoftphone = true;
                } catch (e) {
                  console.warn('mark ringtone playing failed', e);
                }
              })
              .catch((err) => {
                console.warn('ringtone play blocked', err);
              });
          } else {
            try {
              (ringtoneEl as HTMLAudioElement & { __playingForSoftphone?: boolean }).__playingForSoftphone = true;
            } catch (e) {
              console.warn('mark ringtone playing failed', e);
            }
          }
          return;
        } catch (e) {
          console.warn('ringtone play attempt failed', e);
        }
      }
    } catch (err) {
      console.warn('Ringback start failed', err);
    }
  }

  stopRingback() {
    try {
      const ringtoneEl = document.getElementById(RINGTONE_ELEMENT_ID) as HTMLAudioElement | null;
      if (ringtoneEl && (ringtoneEl as HTMLAudioElement & { __playingForSoftphone?: boolean }).__playingForSoftphone) {
        try {
          ringtoneEl.pause();
          ringtoneEl.currentTime = 0;
        } catch (e) {
          console.warn('stop ringtone failed', e);
        }
        try {
          delete (ringtoneEl as HTMLAudioElement & { __playingForSoftphone?: boolean }).__playingForSoftphone;
        } catch (e) {
          console.warn('cleanup ringtone flag failed', e);
        }
      }
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

  playOneShot(src: string, volume = 0.8, durationMs = 6000) {
    try {
      if (this.busyAudioEl) {
        try {
          this.busyAudioEl.pause();
        } catch (err) {
          console.warn('busyAudioEl.pause failed', err);
        }
        try {
          this.busyAudioEl.remove();
        } catch (err) {
          console.warn('busyAudioEl.remove failed', err);
        }
        this.busyAudioEl = null;
      }
      const audio = document.createElement('audio');
      audio.src = src;
      audio.loop = false;
      audio.volume = Math.min(1, volume);
      audio.className = 'hidden';
      const cleanup = () => {
        try {
          audio.pause();
        } catch (err) {
          console.warn('audio.pause cleanup failed', err);
        }
        try {
          audio.removeEventListener('ended', cleanup);
        } catch (err) {
          console.warn('removeEventListener failed', err);
        }
        try {
          audio.remove();
        } catch (err) {
          console.warn('audio.remove cleanup failed', err);
        }
        if (this.busyAudioEl === audio) this.busyAudioEl = null;
      };
      audio.addEventListener('ended', cleanup);
      document.body.appendChild(audio);
      this.busyAudioEl = audio;
      const p = audio.play();
      if (p && typeof (p as unknown as { then?: unknown }).then === 'function') {
        (p as Promise<void>).catch((err) => {
          console.warn('busy audio.play blocked', err);
          setTimeout(() => this.stopRingback(), durationMs);
        });
      }
      setTimeout(cleanup, durationMs);
    } catch (err) {
      console.warn('playOneShot failed', err);
    }
  }
}
