import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const boardId = searchParams.get('boardId');
  const row = db.prepare('SELECT * FROM notes WHERE board_id = ?').get(boardId);
  return NextResponse.json(row || { board_id: Number(boardId), content: '' });
}

export async function PUT(req) {
  const db = getDb();
  const { boardId, content } = await req.json();
  db.prepare(
    `INSERT INTO notes (board_id, content) VALUES (?, ?)
     ON CONFLICT(board_id) DO UPDATE SET content = excluded.content`
  ).run(boardId, content);
  return NextResponse.json({ ok: true });
}
