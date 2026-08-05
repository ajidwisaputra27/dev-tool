import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const sessions = db
    .prepare(`SELECT * FROM pomodoro_sessions WHERE completed_at >= date('now', '-13 days') ORDER BY completed_at`)
    .all();
  return NextResponse.json(sessions);
}

export async function POST(req) {
  const db = getDb();
  const { type, durationSeconds } = await req.json();
  db.prepare('INSERT INTO pomodoro_sessions (type, duration_seconds) VALUES (?, ?)').run(
    type || 'work',
    durationSeconds || 0
  );
  return NextResponse.json({ ok: true });
}
