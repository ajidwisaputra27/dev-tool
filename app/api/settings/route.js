import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach((r) => {
    settings[r.key] = r.value;
  });
  return NextResponse.json(settings);
}

export async function PUT(req) {
  const db = getDb();
  const body = await req.json();
  const stmt = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  );
  const txn = db.transaction((entries) => {
    entries.forEach(([k, v]) => stmt.run(k, String(v)));
  });
  txn(Object.entries(body));
  return NextResponse.json({ ok: true });
}
