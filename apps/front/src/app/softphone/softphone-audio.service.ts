import { Injectable, inject } from '@angular/core';
import { SoftphoneLoggerService } from './softphone-logger.service';

@Injectable({ providedIn: 'root' })
export class SoftphoneAudioService {
  private audioEl: HTMLAudioElement | null = null;
  private readonly logger = inject(SoftphoneLoggerService);

  initAudioElement(id: string) {
    try {
      this.audioEl = document.getElementById(id) as HTMLAudioElement | null;
      if (this.audioEl) {
        try { this.audioEl.autoplay = true; } catch {}
        try { (this.audioEl as any).playsInline = true; } catch {}
      }
    } catch (e) {
      this.logger.warn('initAudioElement failed', e);
      this.audioEl = null;
    }
    return this.audioEl;
  }

  attachStream(stream: MediaStream) {
    if (!this.audioEl) this.initAudioElement('remoteAudio');
    if (!this.audioEl) return false;
    try {
      this.audioEl.srcObject = stream;
      const p = this.audioEl.play();
      if (p && typeof (p as any).then === 'function') (p as Promise<void>).catch(() => {});
      return true;
    } catch (e) {
      this.logger.warn('attachStream failed', e);
      return false;
    }
  }

  attachTrack(track: MediaStreamTrack) {
    return this.attachStream(new MediaStream([track]));
  }

  attachTrackEvent(ev: any) {
    if (!ev) return false;
    if (ev.streams && ev.streams[0]) return this.attachStream(ev.streams[0]);
    if (ev.track) return this.attachTrack(ev.track);
    return false;
  }

  attachReceiversFromPC(pc?: RTCPeerConnection) {
    if (!pc) return false;
    try {
      const receivers = pc.getReceivers?.() ?? [];
      for (const r of receivers) {
        if (r.track && r.track.kind === 'audio') {
          this.attachTrack(r.track);
          return true;
        }
      }
    } catch (e) {
      this.logger.warn('attachReceiversFromPC failed', e);
    }
    return false;
  }

  // Lightweight diagnostics helper
  async logPCDiagnostics(pc?: RTCPeerConnection) {
    if (!pc) return;
    try { this.logger.debug('audioSvc PC iceConnectionState:', pc.iceConnectionState); } catch {}
    try { this.logger.debug('audioSvc PC configuration:', pc.getConfiguration ? pc.getConfiguration() : undefined); } catch {}
    try { this.logger.debug('audioSvc localDescription (excerpt):', pc.localDescription?.sdp?.substring?.(0, 1200)); } catch {}
    try { this.logger.debug('audioSvc remoteDescription (excerpt):', pc.remoteDescription?.sdp?.substring?.(0, 1200)); } catch {}
    try {
      const stats = await pc.getStats();
      const summary: any = { outbound: [], inbound: [] };
      stats.forEach((report: any) => {
        if (report.type === 'outbound-rtp') summary.outbound.push({ id: report.id, kind: report.kind, packetsSent: report.packetsSent, bytesSent: report.bytesSent });
        if (report.type === 'inbound-rtp') summary.inbound.push({ id: report.id, kind: report.kind, packetsReceived: report.packetsReceived, bytesReceived: report.bytesReceived, jitter: report.jitter });
      });
      this.logger.debug('audioSvc PC stats summary:', summary);
    } catch (e) {
      this.logger.warn('audioSvc getStats failed', e);
    }
  }
}
