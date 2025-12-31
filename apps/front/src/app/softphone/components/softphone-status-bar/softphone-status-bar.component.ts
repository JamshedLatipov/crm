import { Component, input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import {
  AgentStatusEnum,
  AGENT_STATUS_LABELS,
  AGENT_STATUS_ICONS,
  AGENT_STATUS_COLORS,
  getAllAgentStatuses,
} from '../../../contact-center/types/agent-status.types';

@Component({
  selector: 'app-softphone-status-bar',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatButtonModule, MatIconModule, MatDividerModule],
  templateUrl: './softphone-status-bar.component.html',
  styles: [
    `:host .status-text { color: #fff; transition: all 0.3s; font-size: 13px; }`,
    `:host .status-text.call-active { 
      font-weight: 600;
      text-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }`,
    `:host .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      transition: all 0.3s;
      box-shadow: 0 0 0 0 currentColor;
    }`,
    `:host .status-dot.pulse {
      animation: statusPulse 2s infinite;
    }`,
    `@keyframes statusPulse {
      0%, 100% { box-shadow: 0 0 0 0 currentColor; }
      50% { box-shadow: 0 0 0 4px transparent; opacity: 0.8; }
    }`,
    `:host ::ng-deep .status-menu { min-width: 280px; }`,
    `:host ::ng-deep .status-menu .mat-mdc-menu-item { height: 40px; }`,
    `:host .status-menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
    }`,
    `:host .status-menu-item .status-menu-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      filter: brightness(0.85) saturate(1.2);
    }`,
    `:host .status-menu-item .status-dot {
      border: 1px solid rgba(0,0,0,0.1);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.5);
    }`,
    `:host button .status-menu-icon {
      color: #fff !important;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }`,
  ],
})
export class SoftphoneStatusBarComponent {
  // Legacy inputs for backward compatibility
  status = input('');
  callActive = input(false);
  paused = input(false);
  reason = input('');

  // New agent status input
  agentStatus = input<AgentStatusEnum>(AgentStatusEnum.OFFLINE);

  // Emit status change events
  @Output() statusChange = new EventEmitter<{
    status: AgentStatusEnum;
    reason?: string;
  }>();

  // For backward compatibility
  @Output() pauseChange = new EventEmitter<{
    paused: boolean;
    reason?: string;
  }>();

  // All available statuses for dropdown
  allStatuses = getAllAgentStatuses();

  // Computed status info
  currentStatusInfo = computed(() => {
    const status = this.agentStatus();
    return {
      label: AGENT_STATUS_LABELS[status],
      icon: AGENT_STATUS_ICONS[status],
      color: AGENT_STATUS_COLORS[status],
    };
  });

  // Check if should show pulse animation
  shouldPulse = computed(() => {
    const status = this.agentStatus();
    return (
      status === AgentStatusEnum.ONLINE ||
      status === AgentStatusEnum.ON_CALL ||
      status === AgentStatusEnum.DO_NOT_DISTURB
    );
  });

  /**
   * Select new status
   */
  selectStatus(status: AgentStatusEnum) {
    // No reason prompt - keep it simple
    this.statusChange.emit({ status });

    // Backward compatibility: emit pauseChange
    if (status === AgentStatusEnum.ONLINE) {
      this.pauseChange.emit({ paused: false });
    } else {
      this.pauseChange.emit({ paused: true });
    }
  }

  /**
   * Quick action: Set online
   */
  setOnline() {
    this.selectStatus(AgentStatusEnum.ONLINE);
  }

  /**
   * Quick action: Set offline
   */
  setOffline() {
    this.selectStatus(AgentStatusEnum.OFFLINE);
  }
}
