import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  SoftphoneStatusBarComponent,
  SoftphoneCallInfoComponent,
  SoftphoneCallActionsComponent,
  SoftphoneScriptsPanelComponent,
} from './components';
import { SoftphoneDialTabComponent } from './components/softphone-dial-tab.component';
import { SoftphoneInfoTabComponent } from './components/softphone-info-tab.component';
import { SoftphoneCallHistoryComponent } from './components/softphone-call-history/softphone-call-history.component';
import { SoftphoneControllerFacade } from './softphone-controller.facade';
import { SoftphoneUiStateService } from './services/softphone-ui-state.service';
import { SoftphoneClipboardService } from './services/softphone-clipboard.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-softphone',
  templateUrl: './softphone.component.html',
  styleUrls: ['./softphone.component.scss'],
  imports: [
    FormsModule,
    CommonModule,
    MatIconModule,
    SoftphoneStatusBarComponent,
    SoftphoneCallInfoComponent,
    SoftphoneCallActionsComponent,
    SoftphoneScriptsPanelComponent,
    SoftphoneDialTabComponent,
    SoftphoneInfoTabComponent,
    SoftphoneCallHistoryComponent,
  ],
})
export class SoftphoneComponent implements OnInit, OnDestroy {
  private readonly facade = inject(SoftphoneControllerFacade);
  private readonly uiState = inject(SoftphoneUiStateService);
  private readonly clipboard = inject(SoftphoneClipboardService);
  private readonly auth = inject(AuthService);

  // Facade signals
  status = this.facade.status;
  hasOperator = this.facade.hasOperator;
  incoming = this.facade.incoming;
  incomingFrom = this.facade.incomingFrom;
  callActive = this.facade.callActive;
  muted = this.facade.muted;
  onHold = this.facade.onHold;
  holdInProgress = this.facade.holdInProgress;
  callDuration = this.facade.callDuration;
  scripts = this.facade.scripts;
  showScripts = this.facade.showScripts;
  selectedScriptBranch = this.facade.selectedScriptBranch;
  memberPaused = this.facade.memberPaused;
  memberReason = this.facade.memberReason;

  // UI state signals
  activeTab = this.uiState.activeTab;
  expanded = this.uiState.expanded;
  missedCallCount = this.uiState.missedCallCount;
  autoExpandOnIncoming = this.uiState.autoExpandOnIncoming;

  sipUser = '';
  sipPassword = '';

  private readonly asteriskHost = environment.asteriskHost || '127.0.0.1';

  ngOnInit() {
    this.initializeOperator();
  }

  ngOnDestroy() {
    this.facade.destroy();
  }

  get dtmfSequence() {
    return this.facade.dtmfSequence();
  }

  get transferTarget() {
    return this.facade.transferTarget();
  }

  set transferTarget(value: string) {
    this.facade.transferTarget.set(value);
  }

  get callee() {
    return this.facade.callee();
  }

  set callee(value: string) {
    this.facade.callee.set(value);
  }

  selectTab(tab: 'dial' | 'history' | 'info' | 'scenarios') {
    this.uiState.selectTab(tab);
  }

  toggleScripts() {
    this.facade.toggleScriptsPanel();
  }

  toggleExpand() {
    this.uiState.toggleExpand();
  }

  connect() {
    this.facade.connect(this.sipUser, this.sipPassword);
  }

  call() {
    this.facade.call(this.asteriskHost);
  }

  hangup() {
    this.facade.hangup();
  }

  manualRegisterCall(payload?: {
    branchId?: string | null;
    note?: string;
    createTask?: boolean;
  }) {
    this.facade.manualRegisterCall(payload);
  }

  onSelectedBranch(id: string | null) {
    this.facade.selectedScriptBranch.set(id);
  }

  onMemberPauseChange(ev: { paused: boolean; reason?: string }) {
    this.facade.updateMemberPause(ev);
  }

  answerIncoming() {
    this.facade.answerIncoming();
  }

  rejectIncoming() {
    this.facade.rejectIncoming();
  }

  toggleMute() {
    this.facade.toggleMute();
  }

  toggleHold() {
    this.facade.toggleHold();
  }

  pressKey(key: string) {
    this.facade.pressKey(key);
  }

  clearDtmf() {
    this.facade.clearDtmf();
  }

  clearNumber() {
    this.facade.clearNumber();
  }

  removeLast() {
    this.facade.removeLast();
  }

  transfer(type: 'blind' | 'attended' = 'blind') {
    this.facade.transfer(type);
  }

  @HostListener('window:paste', ['$event'])
  onPaste(e: ClipboardEvent) {
    this.clipboard.handlePaste(e);
  }

  transferTargetChange(value: string) {
    this.transferTarget = value;
  }

  onCallNumber(number: string) {
    this.callee = number;
    this.uiState.selectTab('dial');
  }

  onViewContact(contactId: string) {
    // TODO: Navigate to contact page when routing is available
  }

  private initializeOperator() {
    let hasOperator = false;
    try {
      const decoded = this.auth.getUserData();
      hasOperator = Boolean(decoded?.operator?.username);
      if (decoded?.operator?.username) this.sipUser = decoded.operator.username;
      if (decoded?.operator?.password) this.sipPassword = decoded.operator.password;
    } catch {
      // ignore
    }
    this.facade.initialize({
      hasOperator,
      sipUser: this.sipUser,
      sipPassword: this.sipPassword,
    });
  }
}
