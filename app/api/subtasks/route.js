import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const db = getDb();
  const { taskId, text } = await req.json();
  if (!taskId || !text) {
    return NextResponse.json({ error: 'taskId dan text wajib diisi' }, { status: 400 });
  }
  const info = db.prepare('INSERT INTO subtasks (task_id, text) VALUES (?, ?)').run(taskId, text);
  const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(info.lastInsertRowid);
  return NextResponse.json(subtask);
}
