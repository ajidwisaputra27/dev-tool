import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const db = getDb();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'id subtask tidak valid' }, { status: 400 });
  }
  const { done } = await req.json();
  db.prepare('UPDATE subtasks SET done = ? WHERE id = ?').run(done ? 1 : 0, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const db = getDb();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'id subtask tidak valid' }, { status: 400 });
  }
  db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
