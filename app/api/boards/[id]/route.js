import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(req, { params }) {
  const db = getDb();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'id board tidak valid' }, { status: 400 });
  }
  db.prepare('DELETE FROM tasks WHERE board_id = ?').run(id);
  db.prepare('DELETE FROM notes WHERE board_id = ?').run(id);
  db.prepare('DELETE FROM boards WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
