import { initDb, query, batch } from "@/lib/turso";

export const BACKUP_VERSION = 1 as const;

type Row = Record<string, unknown>;

export class BackupValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BackupValidationError";
	}
}

export interface BackupSnapshot {
	version: typeof BACKUP_VERSION;
	exportedAt: string;
	boards: Row[];
	tasks: Row[];
	subtasks: Row[];
	notes: Row[];
	pomodoroSessions: Row[];
	settings: Row[];
	spotifyPlaylists: Row[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string): string {
	if (typeof value !== "string") {
		throw new BackupValidationError(`field ${field} harus berupa string`);
	}
	return value;
}

function asOptionalString(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	if (typeof value !== "string") {
		throw new BackupValidationError(
			"field opsional harus berupa string atau null",
		);
	}
	return value;
}

function asOptionalNumber(value: unknown, field: string): number | null {
	if (value === undefined || value === null || value === "") return null;
	if (typeof value !== "number" || !Number.isInteger(value)) {
		throw new BackupValidationError(
			`field ${field} harus berupa bilangan bulat`,
		);
	}
	return value;
}

function asNumber(value: unknown, field: string): number {
	if (typeof value !== "number" || !Number.isInteger(value)) {
		throw new BackupValidationError(
			`field ${field} harus berupa bilangan bulat`,
		);
	}
	return value;
}

function asBooleanish(value: unknown, field: string): boolean {
	if (typeof value === "boolean") return value;
	if (value === 0 || value === 1) return Boolean(value);
	throw new BackupValidationError(
		`field ${field} harus berupa boolean atau 0/1`,
	);
}

function normalizeArray(value: unknown, field: string): Row[] {
	if (!Array.isArray(value)) {
		throw new BackupValidationError(`field ${field} harus berupa array`);
	}
	value.forEach((item, index) => {
		if (!isRecord(item)) {
			throw new BackupValidationError(
				`item ${field}[${index}] harus berupa object`,
			);
		}
	});
	return value as Row[];
}

function normalizeSnapshot(input: unknown): BackupSnapshot {
	if (!isRecord(input)) {
		throw new BackupValidationError("backup JSON harus berupa object");
	}

	const version =
		input.version === undefined
			? BACKUP_VERSION
			: asNumber(input.version, "version");
	if (version !== BACKUP_VERSION) {
		throw new BackupValidationError(`versi backup tidak didukung: ${version}`);
	}

	return {
		version: BACKUP_VERSION,
		exportedAt:
			typeof input.exportedAt === "string"
				? input.exportedAt
				: new Date().toISOString(),
		boards: normalizeArray(input.boards, "boards"),
		tasks: normalizeArray(input.tasks, "tasks"),
		subtasks: normalizeArray(input.subtasks, "subtasks"),
		notes: normalizeArray(input.notes, "notes"),
		pomodoroSessions: normalizeArray(
			input.pomodoroSessions,
			"pomodoroSessions",
		),
		settings: normalizeArray(input.settings, "settings"),
		spotifyPlaylists: normalizeArray(
			input.spotifyPlaylists ?? [],
			"spotifyPlaylists",
		),
	};
}

export async function exportBackup(): Promise<BackupSnapshot> {
	await initDb();
	return {
		version: BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		boards: (await query("SELECT * FROM boards ORDER BY id")) as Row[],
		tasks: (await query("SELECT * FROM tasks ORDER BY id")) as Row[],
		subtasks: (await query("SELECT * FROM subtasks ORDER BY id")) as Row[],
		notes: (await query("SELECT * FROM notes ORDER BY board_id")) as Row[],
		pomodoroSessions: (await query(
			"SELECT * FROM pomodoro_sessions ORDER BY id",
		)) as Row[],
		settings: (await query("SELECT * FROM settings ORDER BY key")) as Row[],
		spotifyPlaylists: (await query(
			"SELECT * FROM spotify_playlists ORDER BY id",
		)) as Row[],
	};
}

export async function importBackup(input: unknown) {
	const snapshot = normalizeSnapshot(input);
	await initDb();

	const stmts: Array<{ sql: string; args?: any[] }> = [
		{ sql: "DELETE FROM subtasks" },
		{ sql: "DELETE FROM tasks" },
		{ sql: "DELETE FROM notes" },
		{ sql: "DELETE FROM pomodoro_sessions" },
		{ sql: "DELETE FROM settings" },
		{ sql: "DELETE FROM spotify_playlists" },
		{ sql: "DELETE FROM boards" },
		{ sql: "DELETE FROM sqlite_sequence" },
	];

	snapshot.boards.forEach((board) => {
		stmts.push({
			sql: "INSERT INTO boards (id, name, created_at) VALUES (?, ?, ?)",
			args: [
				asNumber(board.id, "boards.id"),
				asString(board.name, "boards.name"),
				asOptionalString(board.created_at),
			],
		});
	});

	snapshot.tasks.forEach((task) => {
		stmts.push({
			sql: "INSERT INTO tasks (id, board_id, text, tag, priority, due, estimate, status, git_link, position, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			args: [
				asNumber(task.id, "tasks.id"),
				asNumber(task.board_id, "tasks.board_id"),
				asString(task.text, "tasks.text"),
				asOptionalString(task.tag),
				asOptionalString(task.priority) ?? "med",
				asOptionalString(task.due),
				asOptionalString(task.estimate),
				asOptionalString(task.status) ?? "backlog",
				asOptionalString(task.git_link),
				asOptionalNumber(task.position, "tasks.position") ?? 0,
				asOptionalString(task.created_at),
				asOptionalString(task.completed_at),
			],
		});
	});

	snapshot.subtasks.forEach((subtask) => {
		stmts.push({
			sql: "INSERT INTO subtasks (id, task_id, text, done) VALUES (?, ?, ?, ?)",
			args: [
				asNumber(subtask.id, "subtasks.id"),
				asNumber(subtask.task_id, "subtasks.task_id"),
				asString(subtask.text, "subtasks.text"),
				asBooleanish(subtask.done, "subtasks.done") ? 1 : 0,
			],
		});
	});

	snapshot.notes.forEach((note) => {
		stmts.push({
			sql: "INSERT INTO notes (id, board_id, title, content, created_at) VALUES (?, ?, ?, ?, ?)",
			args: [
				asNumber(note.id, "notes.id"),
				asNumber(note.board_id, "notes.board_id"),
				asOptionalString(note.title) ?? "Untitled",
				asString(note.content, "notes.content"),
				asOptionalString(note.created_at),
			],
		});
	});

	snapshot.pomodoroSessions.forEach((session) => {
		stmts.push({
			sql: "INSERT INTO pomodoro_sessions (id, type, duration_seconds, completed_at) VALUES (?, ?, ?, ?)",
			args: [
				asNumber(session.id, "pomodoroSessions.id"),
				asString(session.type, "pomodoroSessions.type"),
				asNumber(session.duration_seconds, "pomodoroSessions.duration_seconds"),
				asOptionalString(session.completed_at),
			],
		});
	});

	snapshot.settings.forEach((setting) => {
		stmts.push({
			sql: "INSERT INTO settings (key, value) VALUES (?, ?)",
			args: [
				asString(setting.key, "settings.key"),
				asOptionalString(setting.value),
			],
		});
	});

	snapshot.spotifyPlaylists.forEach((playlist) => {
		stmts.push({
			sql: "INSERT INTO spotify_playlists (id, name, link, is_active, created_at) VALUES (?, ?, ?, ?, ?)",
			args: [
				asNumber(playlist.id, "spotifyPlaylists.id"),
				asString(playlist.name, "spotifyPlaylists.name"),
				asString(playlist.link, "spotifyPlaylists.link"),
				asOptionalNumber(playlist.is_active, "spotifyPlaylists.is_active") ?? 0,
				asOptionalString(playlist.created_at),
			],
		});
	});

	await batch(stmts);
}
