import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const db = getDb();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'id playlist tidak valid' }, { status: 400 });
  }

  const body = await req.json();
  const active = Boolean(body.active);
  const link = typeof body.link === 'string' ? body.link.trim() : null;
  const name = typeof body.name === 'string' ? body.name.trim() : null;
  const txn = db.transaction((playlistId, nextActive, nextLink, nextName) => {
    const updates = [];
    const values = [];
    if (nextLink) {
      updates.push('link = ?');
      values.push(nextLink);
    }
    if (nextName) {
      updates.push('name = ?');
      values.push(nextName);
    }
    if (updates.length > 0) {
      values.push(playlistId);
      db.prepare(`UPDATE spotify_playlists SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    if (nextActive) {
      db.prepare('UPDATE spotify_playlists SET is_active = 0').run();
      db.prepare('UPDATE spotify_playlists SET is_active = 1 WHERE id = ?').run(playlistId);
    }
  });
  txn(id, active, link, name);
  const playlist = db.prepare('SELECT * FROM spotify_playlists WHERE id = ?').get(id);
  return NextResponse.json(playlist);
}

export async function DELETE(req, { params }) {
  const db = getDb();
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'id playlist tidak valid' }, { status: 400 });
  }

  db.prepare('DELETE FROM spotify_playlists WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
