import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import AmiClient from 'asterisk-ami-client';
import { RedisQueueStatusService } from './redis-queue-status.service';
import { RedisCallFlowService } from './redis-call-flow.service';

@Injectable()
export class AmiService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmiService.name);
  private client?: any;
  private connected = false;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(
    private readonly redisStatus?: RedisQueueStatusService,
    private readonly redisFlow?: RedisCallFlowService,
  ) {}

  async onModuleInit() {
    this.logger.log('AMI service initializing');
    await this.connect();
  }

  async onModuleDestroy() {
    this.logger.log('AMI service shutting down');
    try {
      if (this.client && this.connected) {
        await this.client.disconnect();
      }
    } catch (e) {
      this.logger.warn('Error while disconnecting AMI client');
    }
    this.connected = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }

  private getConfig() {
    return {
      host: process.env.AMI_HOST || '127.0.0.1',
      port: Number(process.env.AMI_PORT || '5038'),
      username: process.env.AMI_USER || 'admin',
      password: process.env.AMI_PASSWORD || 'amp111',
      reconnect: true,
    };
  }

  async connect() {
    if (this.connected) return;
    const cfg = this.getConfig();
    this.logger.log(`Connecting to AMI ${cfg.host}:${cfg.port} as ${cfg.username}`);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Ami = AmiClient; // imported at top
      this.client = new Ami();
      this.client.on('event', (evt: any) => this.onEvent(evt));
      this.client.on('disconnect', () => this.onDisconnect());
      this.client.on('reconnection', () => this.logger.log('AMI reconnection'));
      await this.client.connect(cfg.username, cfg.password, { host: cfg.host, port: cfg.port });
      this.connected = true;
      this.logger.log('AMI connected');
    } catch (err) {
      this.logger.error('AMI connect failed: ' + (err && (err as Error).message));
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.logger.log('Scheduling AMI reconnect in 5s');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect().catch(() => undefined);
    }, 5000);
  }

  private onDisconnect() {
    this.logger.warn('AMI disconnected');
    this.connected = false;
    this.scheduleReconnect();
  }

  private async onEvent(evt: any) {
    try {
      // Filter queue-related events (AMI sends many event names; queue events often start with 'Queue' or include 'Queue')
      const name = String(evt?.Event || evt?.event || evt?.name || 'Unknown');
      if (!name) return;
      // if (!/queue/i.test(name)) return; // ignore non-queue events by default

      // Choose identifiers for call flow: prefer Linkedid (groups related channels),
      // then Uniqueid, then Channel
      const linked = evt?.Linkedid || evt?.LinkedId || evt?.linkedid || null;
      const unique = evt?.Uniqueid || evt?.UniqueID || evt?.UniqueId || evt?.uniqueid || null;
      const channel = evt?.Channel || evt?.channel || null;
      const flowId = linked || unique || channel;

      console.log('AMI Event:', name, unique, evt);

        // Also update call meta for common events to build structured call summary
        try {
          if (flowId && this.redisFlow) {
            const fid = String(flowId);
            switch (name) {
              case 'Newchannel': {
                  const from = evt?.CallerIDNum || evt?.CallerID || evt?.callerid || undefined;
                  const to = evt?.Exten || evt?.Extension || undefined;
                  await this.redisFlow.patchMeta(fid, { startTime: Date.now(), from, to });
                  await this.redisFlow.ivrEnter(fid, evt?.IVRNode || undefined);
                break;
              }
              case 'QueueCallerJoin': {
                const q = evt?.Queue || evt?.queue;
                  await this.redisFlow.queueJoin(fid, q);
                break;
              }
              case 'QueueCallerLeave': {
                const ql = evt?.Queue || evt?.queue;
                  await this.redisFlow.queueLeave(fid, ql);
                break;
              }
              case 'BridgeEnter':
              case 'BridgeCreate': {
                // Treat as answer if bridge connects caller and agent
                const ch = evt?.Channel || evt?.channel;
                  const other = evt?.OtherChannel || evt?.OtherChannelState || evt?.Peer || undefined;
                  await this.redisFlow.agentAnswer(fid, other, ch);
                break;
              }
              case 'Hangup': {
                  const byChan = evt?.Channel || undefined;
                  const cause = evt?.Cause || evt?.CauseTxt || undefined;
                  // record hangup and compute talk durations if possible
                  await this.redisFlow.agentHangup(fid, undefined, byChan, undefined);
                  await this.redisFlow.patchMeta(fid, { endTime: Date.now(), endChannel: byChan, endCause: cause });
                break;
              }
              default:
                break;
            }
          }
        } catch (e) {
          this.logger.debug('Failed to patch call meta from AMI event: ' + (e as Error).message);
        }

      // Handle queue and channel status updates via Redis
      if (this.redisStatus) {
        await this.handleStatusUpdate(name, evt);
      }
    } catch (e) {
      this.logger.warn('Error handling AMI event: ' + String((e as Error).message));
    }
  }

  private async handleStatusUpdate(eventName: string, evt: any): Promise<void> {
    try {
      console.log(eventName, '-----------------');
      switch (eventName) {
        // Queue Member Status Events
        case 'QueueMemberStatus':
          await this.handleQueueMemberStatus(evt);
          break;

        case 'QueueMemberAdded':
          await this.handleQueueMemberAdded(evt);
          break;

        case 'QueueMemberRemoved':
          await this.handleQueueMemberRemoved(evt);
          break;

        case 'QueueMemberPaused':
          await this.handleQueueMemberPaused(evt);
          break;

        case 'QueueMemberUnpaused':
          await this.handleQueueMemberUnpaused(evt);
          break;

        // Channel Status Events
        case 'VarSet':
          await this.handleVarSet(evt);
          break;

        case 'Newchannel':
          await this.handleNewChannel(evt);
          break;

        case 'Hangup':
          await this.handleHangup(evt);
          break;

        case 'BridgeCreate':
        case 'BridgeEnter':
          await this.handleBridgeEvent(eventName, evt);
          break;

        // Agent login/logout
        case 'Agentlogin':
        case 'AgentLogin':
          await this.handleAgentLogin(evt);
          break;

        case 'Agentlogoff':
        case 'AgentLogoff':
          await this.handleAgentLogoff(evt);
          break;

        // Agent call events
        case 'AgentConnect':
          await this.handleAgentConnect(evt);
          break;

        case 'AgentComplete':
          await this.handleAgentComplete(evt);
          break;

        // Peer status (SIP/PJSIP) - mark operator offline/online
        case 'PeerStatus':
          await this.handlePeerStatus(evt);
          break;

        // Queue Events
        case 'QueueCallerJoin':
        case 'QueueCallerLeave':
          await this.handleQueueCallerEvent(eventName, evt);
          break;

        default:
          // Log other events for monitoring
          if (/queue|channel|bridge/i.test(eventName)) {
            this.logger.debug(`Unhandled event: ${eventName}`);
          }
      }
    } catch (e) {
      this.logger.warn(`Error handling status update for ${eventName}: ${(e as Error).message}`);
    }
  }

  private async handleQueueMemberStatus(evt: any): Promise<void> {
    console.log('Handling QueueMemberStatus', evt);
    const { Queue, MemberName, Status, Paused } = evt;
    const InCall = evt?.InCall ?? evt?.Incall ?? evt?.incall ?? '0';
    if (!Queue || !MemberName) return;

    // Diagnostic logging to help debug inverted status issues
    try {
      const computed = this.mapMemberStatus(Status, Paused, InCall);
      this.logger.debug(`QueueMemberStatus for ${MemberName} in ${Queue}: Status='${Status}', Paused='${Paused}', InCall='${InCall}', computed='${computed}'`);
    } catch (err) {
      this.logger.debug('Error computing member status for debug logging');
    }

    await this.redisStatus?.setOperatorStatus({
      memberId: MemberName,
      memberName: MemberName,
      queueName: Queue,
      paused: Paused === '1',
      status: this.mapMemberStatus(Status, Paused, InCall),
      currentCallId: evt.Channel || evt.Uniqueid || evt.UniqueID || undefined,
      currentChannel: evt.Channel || undefined,
      currentUniqueId: evt.Uniqueid || evt.UniqueID || evt.UniqueId || undefined,
      updatedAt: Date.now(),
    });
  }

  private async handleQueueMemberAdded(evt: any): Promise<void> {
    const { Queue, MemberName, Penalty } = evt;
    if (!Queue || !MemberName) return;

    await this.redisStatus?.setOperatorStatus({
      memberId: MemberName,
      memberName: MemberName,
      queueName: Queue,
      paused: false,
      status: 'idle',
      updatedAt: Date.now(),
    });
  }

  private async handleQueueMemberRemoved(evt: any): Promise<void> {
    const { MemberName } = evt;
    if (!MemberName) return;

    await this.redisStatus?.removeOperatorStatus(MemberName);
  }

  private async handleQueueMemberPaused(evt: any): Promise<void> {
    const { MemberName, Reason } = evt;
    if (!MemberName) return;

    await this.redisStatus?.updateOperatorPausedStatus(MemberName, true, Reason);
  }

  private async handleQueueMemberUnpaused(evt: any): Promise<void> {
    const { MemberName } = evt;
    if (!MemberName) return;

    await this.redisStatus?.updateOperatorPausedStatus(MemberName, false);
  }

  private async handleNewChannel(evt: any): Promise<void> {
    const { Channel, ChannelState, ChannelStateDesc, Extension, Context } = evt;
    if (!Channel) return;

    await this.redisStatus?.setChannelStatus({
      channelId: Channel,
      channelName: Channel,
      state: this.mapChannelState(ChannelStateDesc),
      extension: Extension,
      context: Context,
      updatedAt: Date.now(),
    });
  }

  private async handleHangup(evt: any): Promise<void> {
    const { Channel, ChannelState, Uniqueid, UniqueID, UniqueId } = evt;
    if (!Channel && !Uniqueid && !UniqueID && !UniqueId) return;

    const unique = Uniqueid || UniqueID || UniqueId;

    // When a channel is hung up, clear operator currentCall fields if they match.
    // Operators may store interface names like "PJSIP/operator2" while AMI Channel
    // contains the instance "PJSIP/operator2-0000001b". Match by equality or prefix.
    try {
      const operators = await this.redisStatus?.getAllOperators();
      if (operators && operators.length > 0) {
        for (const op of operators) {
          try {
            const matchChannel = !!(op.currentChannel && Channel && (String(op.currentChannel) === String(Channel) || String(Channel).startsWith(String(op.currentChannel) + '-') || String(op.currentChannel).startsWith(String(Channel) + '-')));
            const matchUnique = op.currentUniqueId && unique && String(op.currentUniqueId) === String(unique);
            const matchLegacy = op.currentCallId && ((Channel && String(op.currentCallId) === String(Channel)) || (unique && String(op.currentCallId) === String(unique)));

            if (matchChannel || matchUnique || matchLegacy) {
              const newStatus: 'idle' | 'in_call' | 'paused' | 'offline' = op.paused ? 'paused' : 'idle';
              await this.redisStatus?.setOperatorStatus({
                memberId: op.memberId,
                memberName: op.memberName,
                queueName: op.queueName,
                paused: op.paused,
                status: newStatus,
                currentCallId: undefined,
                currentChannel: undefined,
                currentUniqueId: undefined,
                updatedAt: Date.now(),
                wrapUpTime: op.wrapUpTime,
                lastLogout: op.lastLogout,
                lastLogin: op.lastLogin,
              });
            }
          } catch (e) {
            this.logger.warn(`Failed to clear operator currentCall for ${op.memberId}: ${(e as Error).message}`);
          }
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to update operators on Hangup: ${(e as Error).message}`);
    }

    // Remove channel from Redis when call ends (use Channel if available, else unique)
    await this.redisStatus?.removeChannelStatus(Channel || unique);
    // mark call ended in call-flow index
    try {
      const flowId = unique || Channel;
      if (flowId && this.redisFlow) {
        await this.redisFlow.markCallEnded(String(flowId));
      }
    } catch (e) {
      this.logger.debug('Failed to mark call ended in flow index: ' + (e as Error).message);
    }
  }

  private async handleBridgeEvent(eventName: string, evt: any): Promise<void> {
    const { Channel, BridgeNumChannels } = evt;
    if (!Channel) return;

    const channelStatus = await this.redisStatus?.getChannelStatus(Channel);
    if (channelStatus) {
      await this.redisStatus?.setChannelStatus({
        ...channelStatus,
        state: 'up',
        updatedAt: Date.now(),
      });
    }

    // When channel becomes up (bridge created/entered), mark matching operators as in_call
    try {
      const operators = await this.redisStatus?.getAllOperators();
      if (operators && operators.length > 0) {
        for (const op of operators) {
          try {
            const matchChannel = !!(op.currentChannel && Channel && (String(op.currentChannel) === String(Channel) || String(Channel).startsWith(String(op.currentChannel) + '-') || String(op.currentChannel).startsWith(String(Channel) + '-')));
            const matchLegacy = op.currentCallId && ((Channel && String(op.currentCallId) === String(Channel)));
            const matchByMember = !!(op.memberId && Channel && (String(Channel) === String(op.memberId) || String(Channel).startsWith(String(op.memberId) + '-') || String(op.memberId).startsWith(String(Channel) + '-')));

            this.logger.debug(`BridgeEvent match check for operator=${op.memberId} memberId=${op.memberId} currentChannel=${op.currentChannel} currentCallId=${op.currentCallId} -> matchChannel=${matchChannel} matchLegacy=${matchLegacy} matchByMember=${matchByMember}`);

            if ((matchChannel || matchLegacy || matchByMember) && op.status !== 'in_call') {
              this.logger.log(`Marking operator in_call: ${op.memberId} (channel=${Channel})`);
              await this.redisStatus?.setOperatorInCall(op.memberId, String(Channel), Channel, evt?.Uniqueid || evt?.UniqueID || evt?.UniqueId);
            }
          } catch (e) {
            this.logger.warn(`Failed to mark operator in_call for ${op.memberId}: ${(e as Error).message}`);
          }
        }
      }
    } catch (e) {
      this.logger.debug(`Error updating operators on bridge event: ${(e as Error).message}`);
    }
  }

  private async handleVarSet(evt: any): Promise<void> {
    const { Channel, ChannelState, ChannelStateDesc } = evt;
    if (!Channel) return;

    // Update channel state if it changed
    const channelStatus = await this.redisStatus?.getChannelStatus(Channel);
    if (channelStatus) {
      const newState = this.mapChannelState(ChannelStateDesc);
      if (newState !== channelStatus.state) {
        await this.redisStatus?.setChannelStatus({
          ...channelStatus,
          state: newState,
          updatedAt: Date.now(),
        });
        // If channel became 'up', mark matching operators as in_call
        if (newState === 'up') {
          try {
            const operators = await this.redisStatus?.getAllOperators();
            if (operators && operators.length > 0) {
              for (const op of operators) {
                try {
                  const matchChannel = !!(op.currentChannel && Channel && (String(op.currentChannel) === String(Channel) || String(Channel).startsWith(String(op.currentChannel) + '-') || String(op.currentChannel).startsWith(String(Channel) + '-')));
                  const matchLegacy = op.currentCallId && ((Channel && String(op.currentCallId) === String(Channel)));
                  const matchByMember = !!(op.memberId && Channel && (String(Channel) === String(op.memberId) || String(Channel).startsWith(String(op.memberId) + '-') || String(op.memberId).startsWith(String(Channel) + '-')));
                  this.logger.debug(`VarSet up match check for operator=${op.memberId} memberId=${op.memberId} currentChannel=${op.currentChannel} currentCallId=${op.currentCallId} -> matchChannel=${matchChannel} matchLegacy=${matchLegacy} matchByMember=${matchByMember}`);
                  if ((matchChannel || matchLegacy || matchByMember) && op.status !== 'in_call') {
                    this.logger.log(`VarSet: marking operator in_call: ${op.memberId} (channel=${Channel})`);
                    await this.redisStatus?.setOperatorInCall(op.memberId, String(Channel), Channel, evt?.Uniqueid || evt?.UniqueID || evt?.UniqueId);
                  }
                } catch (e) {
                  this.logger.warn(`Failed to set operator in_call for ${op.memberId}: ${(e as Error).message}`);
                }
              }
            }
          } catch (e) {
            this.logger.debug(`Error updating operators on VarSet up: ${(e as Error).message}`);
          }
        }
      }
    }
  }

  private async handleQueueCallerEvent(eventName: string, evt: any): Promise<void> {
    const { Queue } = evt;
    if (!Queue) return;

    // Update queue status with caller count
    const operators = await this.redisStatus?.getQueueOperators(Queue);
    const activeCount = operators?.filter((op) => !op.paused).length || 0;

    await this.redisStatus?.setQueueStatus({
      queueName: Queue,
      totalMembers: operators?.length || 0,
      activeMembers: activeCount,
      callsWaiting: eventName === 'QueueCallerJoin' ? 1 : 0,
      updatedAt: Date.now(),
    });
  }

  private async handleAgentLogin(evt: any): Promise<void> {
    // AMI Agentlogin fields vary; try common ones
    const memberId = evt?.Agent || evt?.User || evt?.MemberName || evt?.Member || evt?.Login || evt?.Peer;
    if (!memberId) return;

    try {
      await this.redisStatus?.setOperatorLogin(String(memberId), Date.now());
      this.logger.log(`Operator login recorded: ${memberId}`);
    } catch (e) {
      this.logger.warn(`Failed to record operator login for ${memberId}: ${(e as Error).message}`);
    }
  }

  private async handleAgentLogoff(evt: any): Promise<void> {
    const memberId = evt?.Agent || evt?.User || evt?.MemberName || evt?.Member || evt?.Login || evt?.Peer;
    if (!memberId) return;

    try {
      await this.redisStatus?.setOperatorLogout(String(memberId), Date.now());
      this.logger.log(`Operator logout recorded: ${memberId}`);
    } catch (e) {
      this.logger.warn(`Failed to record operator logout for ${memberId}: ${(e as Error).message}`);
    }
  }

  private async handleAgentConnect(evt: any): Promise<void> {
    // When agent answers a call from queue
    const memberId = evt?.Member || evt?.MemberName || evt?.Interface;
    const channel = evt?.Channel;
    const uniqueid = evt?.Uniqueid || evt?.UniqueID || evt?.UniqueId;
    
    if (!memberId) return;

    try {
      this.logger.log(`Agent connected: ${memberId} on channel ${channel}`);
      await this.redisStatus?.setOperatorInCall(
        String(memberId),
        String(uniqueid || channel),
        channel,
        uniqueid
      );
    } catch (e) {
      this.logger.warn(`Failed to set operator in_call for ${memberId}: ${(e as Error).message}`);
    }
  }

  private async handleAgentComplete(evt: any): Promise<void> {
    // When agent completes a call
    const memberId = evt?.Member || evt?.MemberName || evt?.Interface;
    
    if (!memberId) return;

    try {
      this.logger.log(`Agent call completed: ${memberId}`);
      await this.redisStatus?.clearOperatorCall(String(memberId));
    } catch (e) {
      this.logger.warn(`Failed to clear operator call for ${memberId}: ${(e as Error).message}`);
    }
  }

  private async handlePeerStatus(evt: any): Promise<void> {
    const peer = evt?.Peer || evt?.PeerName || evt?.Peername;
    const pstatus = evt?.PeerStatus || evt?.Peerstatus || evt?.Status;
    if (!peer || !pstatus) return;

    try {
      const s = String(pstatus).toLowerCase();

      // Unreachable/unavailable -> mark operator offline and clear call info
      if (s.includes('unreach') || s.includes('unavail') || s.includes('unreachable')) {
        this.logger.log(`Peer ${peer} is unreachable, marking operator offline`);
        const op = await this.redisStatus?.getOperatorStatus(String(peer));
        if (op) {
          await this.redisStatus?.setOperatorStatus({
            ...op,
            status: 'offline',
            currentCallId: undefined,
            currentChannel: undefined,
            currentUniqueId: undefined,
            updatedAt: Date.now(),
          });
        } else {
          await this.redisStatus?.setOperatorLogout(String(peer), Date.now());
        }
        return;
      }

      // Reachable/registered/ok -> mark operator idle (unless paused)
      if (s.includes('reach') || s.includes('registered') || s.includes('ok') || s.includes('available')) {
        this.logger.log(`Peer ${peer} is reachable, marking operator available`);
        const op = await this.redisStatus?.getOperatorStatus(String(peer));
        if (op) {
          await this.redisStatus?.setOperatorStatus({
            ...op,
            status: op.paused ? 'paused' : 'idle',
            updatedAt: Date.now(),
          });
        } else {
          await this.redisStatus?.setOperatorLogin(String(peer), Date.now());
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to handle PeerStatus for ${peer}: ${(e as Error).message}`);
    }
  }

  private mapMemberStatus(status: string, paused: string, inCall?: string): 'idle' | 'in_call' | 'paused' | 'offline' {
    // Prefer explicit InCall flag when available
    if (paused === '1') return 'paused';
    if (inCall === '1') return 'in_call';
    // Fallback: legacy mapping — treat known numeric states conservatively
    // Status codes from AMI can vary; if status is '0' treat as idle, otherwise default to idle
    if (status === '0') return 'idle';
    return 'idle';
  }

  private mapChannelState(stateDesc: string): 'down' | 'reserved' | 'off_hook' | 'dialing' | 'ring' | 'up' | 'busy' {
    const desc = (stateDesc || '').toLowerCase();
    if (desc.includes('down')) return 'down';
    if (desc.includes('reserved')) return 'reserved';
    if (desc.includes('off')) return 'off_hook';
    if (desc.includes('dialing')) return 'dialing';
    if (desc.includes('ring')) return 'ring';
    if (desc.includes('up')) return 'up';
    if (desc.includes('busy')) return 'busy';
    return 'down';
  }
}
