// Tasks module: no seed migrations; keep migrations list empty so structural
// migrations are not used.
import { SeedTasksDemo1740000000002 } from './1740000000002-SeedTasksDemo';
// import { AddCallLogIdToTasks1740000000003 } from './1740000000003-AddCallLogIdToTasks';

export const TASKS_MIGRATIONS = [
	SeedTasksDemo1740000000002,
	// AddCallLogIdToTasks1740000000003,
];
