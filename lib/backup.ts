import getDb from '@/lib/db';

export const BACKUP_VERSION = 1 as const;

type Row = Record<string, unknown>;

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
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
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new BackupValidationError(`field ${field} harus berupa string`);
  }
  return value;
}

function asOptionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new BackupValidationError('field opsional harus berupa string atau null');
  }
  return value;
}

function asOptionalNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new BackupValidationError(`field ${field} harus berupa bilangan bulat`);
  }
  return value;
}

function asNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new BackupValidationError(`field ${field} harus berupa bilangan bulat`);
  }
  return value;
}

function asBooleanish(value: unknown, field: string): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === 1) return Boolean(value);
  throw new BackupValidationError(`field ${field} harus berupa boolean atau 0/1`);
}

function normalizeArray(value: unknown, field: string): Row[] {
  if (!Array.isArray(value)) {
    throw new BackupValidationError(`field ${field} harus berupa array`);
  }
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      throw new BackupValidationError(`item ${field}[${index}] harus berupa object`);
    }
  });
  return value as Row[];
}

function normalizeSnapshot(input: unknown): BackupSnapshot {
  if (!isRecord(input)) {
    throw new BackupValidationError('backup JSON harus berupa object');
  }

  const version = input.version === undefined ? BACKUP_VERSION : asNumber(input.version, 'version');
  if (version !== BACKUP_VERSION) {
    throw new BackupValidationError(`versi backup tidak didukung: ${version}`);
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : new Date().toISOString(),
    boards: normalizeArray(input.boards, 'boards'),
    tasks: normalizeArray(input.tasks, 'tasks'),
    subtasks: normalizeArray(input.subtasks, 'subtasks'),
    notes: normalizeArray(input.notes, 'notes'),
    pomodoroSessions: normalizeArray(input.pomodoroSessions, 'pomodoroSessions'),
    settings: normalizeArray(input.settings, 'settings'),
    spotifyPlaylists: normalizeArray(input.spotifyPlaylists ?? [], 'spotifyPlaylists')
  };
}

export function exportBackup(): BackupSnapshot {
  const db = getDb();
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    boards: db.prepare('SELECT * FROM boards ORDER BY id').all() as Row[],
    tasks: db.prepare('SELECT * FROM tasks ORDER BY id').all() as Row[],
    subtasks: db.prepare('SELECT * FROM subtasks ORDER BY id').all() as Row[],
    notes: db.prepare('SELECT * FROM notes ORDER BY board_id').all() as Row[],
    pomodoroSessions: db.prepare('SELECT * FROM pomodoro_sessions ORDER BY id').all() as Row[],
    settings: db.prepare('SELECT * FROM settings ORDER BY key').all() as Row[],
    spotifyPlaylists: db.prepare('SELECT * FROM spotify_playlists ORDER BY id').all() as Row[]
  };
}

export function importBackup(input: unknown) {
  const snapshot = normalizeSnapshot(input);
  const db = getDb();
  const insertBoard = db.prepare('INSERT INTO boards (id, name, created_at) VALUES (?, ?, ?)');
  const insertTask = db.prepare(
    'INSERT INTO tasks (id, board_id, text, tag, priority, due, estimate, status, git_link, position, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertSubtask = db.prepare('INSERT INTO subtasks (id, task_id, text, done) VALUES (?, ?, ?, ?)');
  const insertNote = db.prepare('INSERT INTO notes (board_id, content) VALUES (?, ?)');
  const insertPomodoro = db.prepare('INSERT INTO pomodoro_sessions (id, type, duration_seconds, completed_at) VALUES (?, ?, ?, ?)');
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  const insertPlaylist = db.prepare('INSERT INTO spotify_playlists (id, name, link, created_at) VALUES (?, ?, ?, ?)');

  const txn = db.transaction((data: BackupSnapshot) => {
    db.exec(`
      DELETE FROM subtasks;
      DELETE FROM tasks;
      DELETE FROM notes;
      DELETE FROM pomodoro_sessions;
      DELETE FROM settings;
      DELETE FROM spotify_playlists;
      DELETE FROM boards;
      DELETE FROM sqlite_sequence;
    `);

    data.boards.forEach((board) => {
      insertBoard.run(
        asNumber(board.id, 'boards.id'),
        asString(board.name, 'boards.name'),
        asOptionalString(board.created_at)
      );
    });

    data.tasks.forEach((task) => {
      insertTask.run(
        asNumber(task.id, 'tasks.id'),
        asNumber(task.board_id, 'tasks.board_id'),
        asString(task.text, 'tasks.text'),
        asOptionalString(task.tag),
        asOptionalString(task.priority) ?? 'med',
        asOptionalString(task.due),
        asOptionalString(task.estimate),
        asOptionalString(task.status) ?? 'backlog',
        asOptionalString(task.git_link),
        asOptionalNumber(task.position, 'tasks.position') ?? 0,
        asOptionalString(task.created_at),
        asOptionalString(task.completed_at)
      );
    });

    data.subtasks.forEach((subtask) => {
      insertSubtask.run(
        asNumber(subtask.id, 'subtasks.id'),
        asNumber(subtask.task_id, 'subtasks.task_id'),
        asString(subtask.text, 'subtasks.text'),
        asBooleanish(subtask.done, 'subtasks.done') ? 1 : 0
      );
    });

    data.notes.forEach((note) => {
      insertNote.run(asNumber(note.board_id, 'notes.board_id'), asString(note.content, 'notes.content'));
    });

    data.pomodoroSessions.forEach((session) => {
      insertPomodoro.run(
        asNumber(session.id, 'pomodoroSessions.id'),
        asString(session.type, 'pomodoroSessions.type'),
        asNumber(session.duration_seconds, 'pomodoroSessions.duration_seconds'),
        asOptionalString(session.completed_at)
      );
    });

    data.settings.forEach((setting) => {
      insertSetting.run(asString(setting.key, 'settings.key'), asOptionalString(setting.value));
    });

    data.spotifyPlaylists.forEach((playlist) => {
      insertPlaylist.run(
        asNumber(playlist.id, 'spotifyPlaylists.id'),
        asString(playlist.name, 'spotifyPlaylists.name'),
        asString(playlist.link, 'spotifyPlaylists.link'),
        asOptionalNumber(playlist.is_active, 'spotifyPlaylists.is_active') ?? 0,
        asOptionalString(playlist.created_at)
      );
    });
  });

  txn(snapshot);
}
