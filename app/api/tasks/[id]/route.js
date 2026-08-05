import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

const EDITABLE_FIELDS = ['text', 'tag', 'priority', 'due', 'estimate', 'status', 'git_link', 'position'];

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const db = getDb();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'id task tidak valid' }, { status: 400 });
  }
  const body = await req.json();

  const fields = [];
  const values = [];
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }
  if (body.status === 'done') {
    fields.push('completed_at = ?');
    values.push(new Date().toISOString());
  } else if (body.status && body.status !== 'done') {
    fields.push('completed_at = NULL');
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ?').all(id);
  return NextResponse.json({ ...task, subtasks });
}

export async function DELETE(req, { params }) {
  const db = getDb();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'id task tidak valid' }, { status: 400 });
  }
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
