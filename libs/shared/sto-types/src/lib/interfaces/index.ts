export interface RegisterDisplayEvent {
  displayId: string;
  filters: {
    zones: string[];
    workTypes?: string[];
    showBlocked: boolean;
  };
}

export interface QueueUpdateEvent {
  type: 'queue_update';
  orders: any[];
  timestamp: Date;
}

export interface MechanicsUpdateEvent {
  type: 'mechanics_update';
  mechanics: any[];
}

export interface ForceLogoutEvent {
  type: 'force_logout';
  reason: string;
}
