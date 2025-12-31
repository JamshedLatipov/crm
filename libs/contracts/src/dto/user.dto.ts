import { UserRole } from '../constants';

/**
 * User representation for inter-service communication
 * Excludes sensitive fields like password
 */
export interface UserDto {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  roles: string[];
  department?: string;
  avatar?: string;
  isActive: boolean;
  timezone: string;
  
  // Workload
  currentLeadsCount: number;
  maxLeadsCapacity: number;
  currentDealsCount: number;
  maxDealsCapacity: number;
  currentTasksCount: number;
  maxTasksCapacity: number;
  
  // Performance
  conversionRate: number;
  totalRevenue: number;
  totalLeadsHandled: number;
  
  // Assignment
  isAvailableForAssignment: boolean;
  managerID?: number;
  
  // SIP
  sipEndpointId?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}

export interface CreateUserDto {
  username: string;
  password: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  department?: string;
  timezone?: string;
  sipEndpointId?: string;
  maxLeadsCapacity?: number;
  maxDealsCapacity?: number;
  maxTasksCapacity?: number;
  managerID?: number;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  department?: string;
  avatar?: string;
  timezone?: string;
  isActive?: boolean;
  roles?: string[];
  sipEndpointId?: string;
  maxLeadsCapacity?: number;
  maxDealsCapacity?: number;
  maxTasksCapacity?: number;
  isAvailableForAssignment?: boolean;
  managerID?: number;
}

export interface UpdateWorkloadDto {
  userId: number;
  entityType: 'lead' | 'deal' | 'task';
  delta: number; // +1 or -1
}

export interface GetManagersDto {
  availableOnly?: boolean;
  territory?: string;
  skill?: string;
}

export interface AutoAssignCriteriaDto {
  territory?: string;
  skill?: string;
  source?: string;
  value?: number;
  priority?: string;
}

export interface ManagerStatsDto {
  id: number;
  username: string;
  fullName: string;
  currentLeadsCount: number;
  maxLeadsCapacity: number;
  currentDealsCount: number;
  maxDealsCapacity: number;
  conversionRate: number;
  totalRevenue: number;
  workloadPercentage: number;
}
