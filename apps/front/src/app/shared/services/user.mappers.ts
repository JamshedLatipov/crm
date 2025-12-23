import { Manager } from './user.service';

// Convert a backend manager object (unknown shape) into frontend Manager
export function mapBackendToManager(u: Record<string, unknown>): Manager {
  const idVal = u['id'];
  const firstName = (u['firstName'] as string) ?? '';
  const lastName = (u['lastName'] as string) ?? '';
  const name = (u['name'] as string) ?? `${firstName} ${lastName}`.trim();
  const rolesRaw = u['roles'];

  return {
    id: String(idVal ?? ''),
    username: (u['username'] as string) ?? '',
    firstName,
    lastName,
    email: (u['email'] as string) ?? '',
    department: (u['department'] as string) ?? '',
    roles: Array.isArray(rolesRaw)
      ? (rolesRaw as string[])
      : u['role']
      ? [String(u['role'])]
      : [],
    currentLeadsCount: Number(u['workload'] ?? u['currentLeadsCount']) || 0,
    maxLeadsCapacity: Number(u['maxCapacity'] ?? u['maxLeadsCapacity']) || 0,
    currentDealsCount: Number(u['currentDealsCount'] ?? 0) || 0,
    maxDealsCapacity: Number(u['maxDealsCapacity'] ?? 0) || 0,
    currentTasksCount: Number(u['currentTasksCount'] ?? 0) || 0,
    maxTasksCapacity: Number(u['maxTasksCapacity'] ?? 0) || 0,
    conversionRate: Number(u['conversionRate']) || 0,
    isAvailableForAssignment: !!(
      u['isAvailable'] ?? u['isAvailableForAssignment']
    ),
    fullName: name,
    workloadPercentage: Number(u['workloadPercentage']) || 0,
    isOverloaded: !!u['isOverloaded'],
    skills: (u['skills'] as string[]) ?? [],
    territories: (u['territories'] as string[]) ?? [],
    sipEndpointId: (u['sipEndpointId'] as string) || ''
  };
}
