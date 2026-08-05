import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'dashboard.db');

type Statement = ReturnType<DatabaseSync['prepare']>;

class DatabaseHandle {
  private readonly db: DatabaseSync;

  constructor(filePath: string) {
    this.db = new DatabaseSync(filePath);
  }

  prepare(sql: string): Statement {
    return this.db.prepare(sql);
  }

  exec(sql: string) {
    return this.db.exec(sql);
  }

  pragma(statement: string) {
    return this.db.exec(`PRAGMA ${statement}`);
  }

  transaction<T extends unknown[], R>(callback: (...args: T) => R) {
    return (...args: T) => {
      this.exec('BEGIN');
      try {
        const result = callback(...args);
        this.exec('COMMIT');
        return result;
      } catch (error) {
        this.exec('ROLLBACK');
        throw error;
      }
    };
  }

  close() {
    this.db.close();
  }
}

type DatabaseInstance = DatabaseHandle;

let db: DatabaseInstance | null = null;

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function runMigrations(instance: DatabaseInstance) {
  instance.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      tag TEXT,
      priority TEXT DEFAULT 'med',
      due TEXT,
      estimate TEXT,
      status TEXT DEFAULT 'backlog',
      git_link TEXT,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      board_id INTEGER PRIMARY KEY,
      content TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      completed_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS spotify_playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      link TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const playlistColumns = instance.prepare("PRAGMA table_info(spotify_playlists)").all() as Array<{ name: string }>;
  if (!playlistColumns.some((column) => column.name === 'is_active')) {
    instance.exec('ALTER TABLE spotify_playlists ADD COLUMN is_active INTEGER DEFAULT 0');
  }

  const boardCountResult = instance.prepare('SELECT COUNT(*) AS c FROM boards').get() as { c: number } | undefined;
  const boardCount = boardCountResult?.c ?? 0;
  if (boardCount === 0) {
    const info = instance.prepare('INSERT INTO boards (name) VALUES (?)').run('main');
    instance.prepare('INSERT INTO notes (board_id, content) VALUES (?, ?)').run(info.lastInsertRowid, '');
  }
}

function open() {
  ensureDataDir();
  const instance = new DatabaseHandle(DB_PATH);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  runMigrations(instance);
  return instance;
}

export default function getDb() {
  if (!db) db = open();
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export function DB_FILE_PATH() {
  return DB_PATH;
}
