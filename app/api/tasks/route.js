import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const boardId = searchParams.get('boardId');
  if (!boardId) return NextResponse.json([]);

  const tasks = db.prepare('SELECT * FROM tasks WHERE board_id = ? ORDER BY position, id').all(boardId);
  const subtasks = db
    .prepare('SELECT * FROM subtasks WHERE task_id IN (SELECT id FROM tasks WHERE board_id = ?)')
    .all(boardId);

  const withSubs = tasks.map((t) => ({
    ...t,
    subtasks: subtasks.filter((s) => s.task_id === t.id)
  }));
  return NextResponse.json(withSubs);
}

export async function POST(req) {
  const db = getDb();
  const body = await req.json();
  const { boardId, text, tag, priority, due, estimate, gitLink } = body;
  if (!boardId || !text) {
    return NextResponse.json({ error: 'boardId dan text wajib diisi' }, { status: 400 });
  }
  const info = db
    .prepare(
      `INSERT INTO tasks (board_id, text, tag, priority, due, estimate, git_link, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'backlog')`
    )
    .run(boardId, text, tag || null, priority || 'med', due || null, estimate || null, gitLink || null);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  return NextResponse.json({ ...task, subtasks: [] });
}
