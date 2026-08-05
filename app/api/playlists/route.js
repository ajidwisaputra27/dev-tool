import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const playlists = db.prepare('SELECT * FROM spotify_playlists ORDER BY id').all();
  return NextResponse.json(playlists);
}

export async function POST(req) {
  const db = getDb();
  const body = await req.json();
  const name = (body.name || '').trim();
  const link = (body.link || '').trim();
  if (!name || !link) {
    return NextResponse.json({ error: 'nama dan link playlist wajib diisi' }, { status: 400 });
  }

  const info = db.prepare('INSERT INTO spotify_playlists (name, link) VALUES (?, ?)').run(name, link);
  const playlist = db.prepare('SELECT * FROM spotify_playlists WHERE id = ?').get(info.lastInsertRowid);
  return NextResponse.json(playlist);
}
