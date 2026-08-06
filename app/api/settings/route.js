import { NextResponse } from "next/server";
import { initDb, query, run } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET() {
	await initDb();
	const rows = await query("SELECT * FROM settings");
	const settings = {};
	rows.forEach((r) => {
		settings[r.key] = r.value;
	});
	return NextResponse.json(settings);
}

export async function PUT(req) {
	await initDb();
	const body = await req.json();
	await Promise.all(
		Object.entries(body).map(([k, v]) =>
			run(
				`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
				[k, String(v)],
			),
		),
	);
	return NextResponse.json({ ok: true });
}
