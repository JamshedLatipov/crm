export const TASKS_MIGRATIONS = [
];

import { DropAssignedToFromTasks1769999999999 } from './1769999999999-DropAssignedToFromTasks';

// Append the new migration to the module migrations list
TASKS_MIGRATIONS.push(DropAssignedToFromTasks1769999999999);
