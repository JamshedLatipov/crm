import { Injectable, signal } from '@angular/core';

/**
 * Service managing call state (timer, status, hold/mute flags)
 */
@Injectable({ providedIn: 'root' })
export class SoftphoneCallStateService {
  // Call state signals
  callActive = signal(false);
  muted = signal(false);
  onHold = signal(false);
  holdInProgress = signal(false);
  callDuration = signal('00:00');
  
  // Incoming call state
  incoming = signal(false);
  incomingFrom = signal<string | null>(null);
  incomingDisplayName = signal<string | null>(null); // Resolved contact name
  
  // Call metadata
  callNote = signal<string>('');
  callType = signal<string | null>(null);
  selectedScriptBranch = signal<string | null>(null);
  
  // DTMF sequence
  dtmfSequence = signal('');
  
  // Private state for timer
  private callStart: number | null = null;
  private durationTimer: number | null = null;
  private preHoldMuted: boolean | null = null;

  startCallTimer() {
    this.callStart = Date.now();
    this.updateDuration();
    this.durationTimer = window.setInterval(() => this.updateDuration(), 1000);
  }

  stopCallTimer() {
    if (this.durationTimer !== null) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    this.callStart = null;
  }

  private updateDuration() {
    if (!this.callStart) return;
    const diff = Math.floor((Date.now() - this.callStart) / 1000);
    const mm = String(Math.floor(diff / 60)).padStart(2, '0');
    const ss = String(diff % 60).padStart(2, '0');
    this.callDuration.set(`${mm}:${ss}`);
  }

  resetCallState() {
    this.callActive.set(false);
    this.incoming.set(false);
    this.incomingFrom.set(null);
    this.incomingDisplayName.set(null);
    this.muted.set(false);
    this.onHold.set(false);
    this.holdInProgress.set(false);
    this.stopCallTimer();
    this.preHoldMuted = null;
  }

  setIncomingCall(from: string | null) {
    this.incoming.set(true);
    this.incomingFrom.set(from);
    this.incomingDisplayName.set(null); // Will be set separately after resolution
  }

  setIncomingDisplayName(name: string | null) {
    this.incomingDisplayName.set(name);
  }

  clearIncomingCall() {
    this.incoming.set(false);
    this.incomingFrom.set(null);
    this.incomingDisplayName.set(null);
  }

  setCallActive(active: boolean) {
    this.callActive.set(active);
    if (active) {
      this.startCallTimer();
    }
  }

  setMuted(muted: boolean) {
    this.muted.set(muted);
  }

  setHold(hold: boolean, inProgress: boolean = false) {
    this.onHold.set(hold);
    this.holdInProgress.set(inProgress);
  }

  // Remember/restore mute state around hold
  savePreHoldMuteState() {
    this.preHoldMuted = this.muted();
  }

  restorePreHoldMuteState() {
    if (this.preHoldMuted !== null) {
      this.muted.set(this.preHoldMuted);
      this.preHoldMuted = null;
    }
  }

  addDTMF(key: string) {
    const current = this.dtmfSequence();
    this.dtmfSequence.set((current + key).slice(-32)); // keep last 32 keys
  }

  clearDTMF() {
    this.dtmfSequence.set('');
  }

  setCallMetadata(note?: string, type?: string | null, branch?: string | null) {
    if (note !== undefined) this.callNote.set(note);
    if (type !== undefined) this.callType.set(type);
    if (branch !== undefined) this.selectedScriptBranch.set(branch);
  }

  cleanup() {
    this.stopCallTimer();
  }
}
