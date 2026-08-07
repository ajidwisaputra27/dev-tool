import { createClient, type Client, type InValue } from "@libsql/client";

let client: Client | null = null;

export function getClient(): Client {
	if (!client) {
		const url = process.env.TURSO_DATABASE_URL;
		const authToken = process.env.TURSO_AUTH_TOKEN;
		if (!url) throw new Error("TURSO_DATABASE_URL is not set");
		client = createClient({ url, authToken });
	}
	return client;
}

export async function initDb() {
	const db = getClient();
	await db.executeMultiple(`
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      title TEXT DEFAULT 'Untitled',
      content TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
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

	// ensure default board
	const boards = await db.execute("SELECT COUNT(*) as c FROM boards");
	if (Number(boards.rows[0].c) === 0) {
		const r = await db.execute("INSERT INTO boards (name) VALUES ('main')");
		await db.execute({
			sql: "INSERT INTO notes (board_id, title, content) VALUES (?, ?, ?)",
			args: [r.lastInsertRowid!, "scratch.md", ""],
		});
	}
}

// Helper: run query and return rows as plain objects
export async function query<T = Record<string, unknown>>(
	sql: string,
	args: InValue[] = [],
): Promise<T[]> {
	const db = getClient();
	const result = await db.execute({ sql, args });
	return result.rows as unknown as T[];
}

// Helper: run INSERT/UPDATE/DELETE, return lastInsertRowid and rowsAffected
export async function run(
	sql: string,
	args: InValue[] = [],
): Promise<{ lastInsertRowid: bigint | number | null; rowsAffected: number }> {
	const db = getClient();
	const result = await db.execute({ sql, args });
	return {
		lastInsertRowid: result.lastInsertRowid ?? null,
		rowsAffected: result.rowsAffected,
	};
}

// Helper: run multiple statements in a batch (transaction-like)
export async function batch(stmts: Array<{ sql: string; args?: InValue[] }>) {
	const db = getClient();
	await db.batch(
		stmts.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
		"write",
	);
}
