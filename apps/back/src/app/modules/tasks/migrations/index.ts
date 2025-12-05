// Tasks module: no seed migrations; keep migrations list empty so structural
// migrations are not used.
import { SeedTasksDemo1740000000002 } from './1740000000002-SeedTasksDemo';

export const TASKS_MIGRATIONS = [
	SeedTasksDemo1740000000002,
];
