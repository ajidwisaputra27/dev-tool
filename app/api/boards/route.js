import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const boards = db.prepare('SELECT * FROM boards ORDER BY id').all();
  return NextResponse.json(boards);
}

export async function POST(req) {
  const db = getDb();
  const body = await req.json();
  const name = (body.name || 'new board').trim() || 'new board';
  const info = db.prepare('INSERT INTO boards (name) VALUES (?)').run(name);
  db.prepare('INSERT INTO notes (board_id, content) VALUES (?, ?)').run(info.lastInsertRowid, '');
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(info.lastInsertRowid);
  return NextResponse.json(board);
}
