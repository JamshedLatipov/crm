import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueMember } from '../calls/entities/queue-member.entity';
import { AgentStatus } from './entities/agent-status.entity';
import { AgentStatusEnum } from './enums/agent-status.enum';
import { AmiService } from '../ami/ami.service';

@Injectable()
export class EndpointSyncService implements OnModuleInit {
  private readonly logger = new Logger(EndpointSyncService.name);

  constructor(
    @InjectRepository(QueueMember) private readonly membersRepo: Repository<QueueMember>,
    @InjectRepository(AgentStatus) private readonly agentStatusRepo: Repository<AgentStatus>,
    private readonly amiService: AmiService,
    @Inject('CONTACT_CENTER_SERVICE')
    private contactCenterService?: any,
  ) {}

  async onModuleInit() {
    // Initial sync on startup
    this.logger.log('🚀 Starting initial endpoint status sync...');
    await this.syncEndpointStatus();
    this.logger.log('✅ Initial endpoint status sync completed');
  }

  // Cron job: sync endpoint status every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncEndpointStatus() {
    try {
      // Get all registered SIP endpoints
      const registeredEndpoints = await this.getRegisteredSipEndpoints();
      
      // Get all queue members
      const members = await this.membersRepo.find();
      
      let updated = 0;
      
      for (const member of members) {
        const memberInterface = member.iface || member.member_interface || member.member_name;
        if (!memberInterface) continue;
        
        const extension = memberInterface.split('/')[1];
        if (!extension) continue;
        
        // Check if endpoint is registered
        const isRegistered = registeredEndpoints.has(extension) || registeredEndpoints.has(memberInterface);
        
        // Update paused status based on registration
        // If not registered -> set paused=true (offline)
        // If registered and was paused by system -> set paused=false (online)
        
        if (!isRegistered && !member.paused) {
          // Endpoint is offline but member is not paused -> pause them
          this.logger.log(`📴 Setting ${member.memberid} (${extension}) to paused - endpoint not registered`);
          member.paused = true;
          member.reason_paused = 'Auto: SIP not registered';
          await this.membersRepo.save(member);
          
          // Also update AgentStatus to OFFLINE
          await this.updateAgentStatusToOffline(extension, 'Auto: SIP not registered');
          updated++;
          
        } else if (isRegistered && member.paused && member.reason_paused?.startsWith('Auto:')) {
          // Endpoint is online and member was auto-paused -> unpause them
          this.logger.log(`📳 Setting ${member.memberid} (${extension}) to available - endpoint registered`);
          member.paused = false;
          member.reason_paused = null;
          await this.membersRepo.save(member);
          
          // Also update AgentStatus to ONLINE if it was auto-set to OFFLINE
          await this.updateAgentStatusToOnline(extension);
          updated++;
        }
      }
      
      if (updated > 0) {
        this.logger.log(`✅ Updated ${updated} queue member(s) status`);
      } else {
        this.logger.debug('✅ All queue members status up-to-date');
      }
      
    } catch (err) {
      this.logger.error('Failed to sync endpoint status:', err);
    }
  }

  // Get registered SIP endpoints using multiple methods
  private async getRegisteredSipEndpoints(): Promise<Set<string>> {
    const registered = new Set<string>();
    
    try {
      const client = this.amiService.getClient();
      if (!client) {
        this.logger.warn('AMI client not available for endpoint check');
        return registered;
      }
      
      // Run all methods in parallel and combine results for maximum reliability
      const [method1, method2, method3, method4] = await Promise.all([
        this.tryGetEndpointsMethod1(client).catch(() => new Set<string>()),
        this.tryGetEndpointsMethod2(client).catch(() => new Set<string>()),
        this.tryGetEndpointsMethod3(client).catch(() => new Set<string>()),
        this.tryGetEndpointsMethod4(client).catch(() => new Set<string>()),
      ]);
      
      // Combine results from all methods
      method1.forEach(ep => registered.add(ep));
      method2.forEach(ep => registered.add(ep));
      method3.forEach(ep => registered.add(ep));
      method4.forEach(ep => registered.add(ep));
      
      return registered;
    } catch (err) {
      this.logger.warn('Failed to get registered endpoints:', err);
      return registered;
    }
  }

  // Method 1: Try Agents action (most reliable for queue agents)
  private async tryGetEndpointsMethod1(client: any): Promise<Set<string>> {
    return new Promise((resolve) => {
      const registered = new Set<string>();
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          cleanup();
          resolve(registered);
        }
      }, 1000);
      
      const handler = (evt: any) => {
        if (resolved) return;
        
        const eventName = evt?.Event;
        if (eventName === 'Agents') {
          const agent = evt.Agent;
          const status = evt.Status;
          const name = evt.Name;
          
          // Agent is logged in if status is not AGENT_LOGGEDOFF
          if (agent && status && status !== 'AGENT_LOGGEDOFF') {
            // Extract endpoint from agent (e.g., "PJSIP/operator2")
            if (agent.includes('/')) {
              const endpoint = agent.split('/')[1];
              registered.add(endpoint);
              registered.add(agent);
            }
          }
        }
        
        if (eventName === 'AgentsComplete') {
          cleanup();
          resolve(registered);
        }
      };
      
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        client.off('event', handler);
      };
      
      client.on('event', handler);
      
      this.amiService.action('Agents', {})
        .catch(() => {
          // Command not supported, will timeout and try other method
        });
    });
  }

  // Method 2: Try PJSIPShowRegistrationInboundContactStatuses
  private async tryGetEndpointsMethod2(client: any): Promise<Set<string>> {
    return new Promise((resolve) => {
      const registered = new Set<string>();
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          cleanup();
          resolve(registered);
        }
      }, 1000);
      
      const handler = (evt: any) => {
        if (resolved) return;
        
        const eventName = evt?.Event;
        if (eventName === 'ContactStatusDetail' || eventName === 'ContactStatus') {
          const uri = evt.URI || evt.AOR;
          const status = evt.Status;
          
          // Extract endpoint from URI (sip:operator2@...)
          if (uri && status && status !== 'Removed' && status !== 'Unknown') {
            const match = uri.match(/sip:([^@]+)@/);
            if (match) {
              registered.add(match[1]);
            }
          }
        }
        
        if (eventName === 'ContactStatusDetailComplete') {
          cleanup();
          resolve(registered);
        }
      };
      
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        client.off('event', handler);
      };
      
      client.on('event', handler);
      
      this.amiService.action('PJSIPShowRegistrationInboundContactStatuses', {})
        .catch(() => {
          // Command not supported, will timeout and try other method
        });
    });
  }

  // Method 3: Check PJSIP endpoints via device state
  private async tryGetEndpointsMethod3(client: any): Promise<Set<string>> {
    return new Promise((resolve) => {
      const registered = new Set<string>();
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          cleanup();
          resolve(registered);
        }
      }, 1000);
      
      const handler = (evt: any) => {
        if (resolved) return;
        
        const eventName = evt?.Event;
        if (eventName === 'DeviceStateChange') {
          const device = evt.Device;
          const state = evt.State;
          
          // State: NOT_INUSE, INUSE, BUSY, INVALID, UNAVAILABLE, RINGING, RINGINUSE, ONHOLD
          // Registered = anything except INVALID, UNAVAILABLE
          if (device && state && !['INVALID', 'UNAVAILABLE'].includes(state)) {
            // Extract endpoint from device (PJSIP/operator2)
            if (device.includes('/')) {
              const endpoint = device.split('/')[1];
              registered.add(endpoint);
              registered.add(device);
            }
          }
        }
      };
      
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        client.off('event', handler);
      };
      
      client.on('event', handler);
      
      // Subscribe to device state changes
      this.amiService.action('DeviceStateList', {})
        .then(() => {
          // Wait a bit for events
          setTimeout(() => {
            cleanup();
            resolve(registered);
          }, 800);
        })
        .catch(() => {
          cleanup();
          resolve(registered);
        });
    });
  }

  // Method 4: Use QueueStatus data (most reliable fallback)
  private async tryGetEndpointsMethod4(client: any): Promise<Set<string>> {
    return new Promise((resolve) => {
      const registered = new Set<string>();
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          cleanup();
          resolve(registered);
        }
      }, 1000);
      
      const handler = (evt: any) => {
        if (resolved) return;
        
        const eventName = evt?.Event;
        if (eventName === 'QueueMember') {
          const location = evt.Location || evt.StateInterface || evt.Name;
          const paused = evt.Paused === '1' || evt.Paused === 1;
          const status = parseInt(evt.Status || '0', 10);
          
          // Member is available if: not paused AND status is NOT unavailable (5)
          // Status 5 = AST_DEVICE_UNAVAILABLE means SIP not registered
          if (location && !paused && status !== 5) {
            const endpoint = location.includes('/') ? location.split('/')[1] : location;
            registered.add(endpoint);
            registered.add(location);
          }
        }
        
        if (eventName === 'QueueStatusComplete') {
          cleanup();
          resolve(registered);
        }
      };
      
      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        client.off('event', handler);
      };
      
      client.on('event', handler);
      
      // Get status for all queues
      this.amiService.action('QueueStatus', {})
        .catch(() => {
          cleanup();
          resolve(registered);
        });
    });
  }

  /**
   * Update AgentStatus to OFFLINE when SIP endpoint disconnects
   */
  private async updateAgentStatusToOffline(extension: string, reason: string): Promise<void> {
    try {
      const agentStatus = await this.agentStatusRepo.findOne({ where: { extension } });
      
      if (!agentStatus) {
        this.logger.warn(`AgentStatus not found for extension ${extension}, creating new record`);
        const newStatus = this.agentStatusRepo.create({
          extension,
          status: AgentStatusEnum.OFFLINE,
          previousStatus: AgentStatusEnum.OFFLINE,
          reason,
          statusChangedAt: new Date(),
        });
        await this.agentStatusRepo.save(newStatus);
      } else {
        // Only update if not already OFFLINE
        if (agentStatus.status !== AgentStatusEnum.OFFLINE) {
          this.logger.log(`🔴 Setting agent ${extension} status to OFFLINE: ${reason}`);
          agentStatus.previousStatus = agentStatus.status;
          agentStatus.status = AgentStatusEnum.OFFLINE;
          agentStatus.reason = reason;
          agentStatus.statusChangedAt = new Date();
          await this.agentStatusRepo.save(agentStatus);
          
          // Broadcast via WebSocket if service is available
          this.contactCenterService?.broadcastAgentStatusChange({
            extension,
            status: AgentStatusEnum.OFFLINE,
            previousStatus: agentStatus.previousStatus,
            reason,
          });
        }
      }
    } catch (err) {
      this.logger.error(`Failed to update AgentStatus to OFFLINE for ${extension}:`, err);
    }
  }

  /**
   * Update AgentStatus to ONLINE when SIP endpoint reconnects
   */
  private async updateAgentStatusToOnline(extension: string): Promise<void> {
    try {
      const agentStatus = await this.agentStatusRepo.findOne({ where: { extension } });
      
      if (!agentStatus) {
        // Create new status if doesn't exist
        const newStatus = this.agentStatusRepo.create({
          extension,
          status: AgentStatusEnum.ONLINE,
          previousStatus: AgentStatusEnum.OFFLINE,
          reason: 'Auto: SIP registered',
          statusChangedAt: new Date(),
        });
        await this.agentStatusRepo.save(newStatus);
        this.logger.log(`🟢 Created AgentStatus for ${extension} with status ONLINE`);
      } else {
        // Only restore to ONLINE if it was auto-set to OFFLINE
        if (agentStatus.status === AgentStatusEnum.OFFLINE && agentStatus.reason?.startsWith('Auto:')) {
          this.logger.log(`🟢 Restoring agent ${extension} status to ONLINE (was auto-offline)`);
          agentStatus.previousStatus = agentStatus.status;
          agentStatus.status = AgentStatusEnum.ONLINE;
          agentStatus.reason = 'Auto: SIP registered';
          agentStatus.statusChangedAt = new Date();
          await this.agentStatusRepo.save(agentStatus);
          
          // Broadcast via WebSocket if service is available
          this.contactCenterService?.broadcastAgentStatusChange({
            extension,
            status: AgentStatusEnum.ONLINE,
            previousStatus: agentStatus.previousStatus,
            reason: agentStatus.reason,
          });
        } else if (agentStatus.status === AgentStatusEnum.OFFLINE && !agentStatus.reason?.startsWith('Auto:')) {
          // Agent was manually set offline, don't auto-restore
          this.logger.debug(`Agent ${extension} is manually offline, not auto-restoring to ONLINE`);
        }
      }
    } catch (err) {
      this.logger.error(`Failed to update AgentStatus to ONLINE for ${extension}:`, err);
    }
  }
}
