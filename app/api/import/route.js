import { NextResponse } from 'next/server';
import { BackupValidationError, importBackup } from '@/lib/backup';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || typeof file.text !== 'function') {
    return NextResponse.json({ error: 'tidak ada file JSON yang dikirim' }, { status: 400 });
  }

  const text = await file.text();
  if (!text.trim()) {
    return NextResponse.json({ error: 'file JSON kosong' }, { status: 400 });
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'file bukan JSON yang valid' }, { status: 400 });
  }

  try {
    importBackup(payload);
  } catch (err) {
    if (err instanceof BackupValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'gagal impor backup JSON' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
