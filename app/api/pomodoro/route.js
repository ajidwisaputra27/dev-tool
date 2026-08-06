import { NextResponse } from "next/server";
import { initDb, query, run } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET() {
	await initDb();
	const sessions = await query(
		`SELECT * FROM pomodoro_sessions WHERE completed_at >= date('now', '-13 days') ORDER BY completed_at`,
	);
	return NextResponse.json(sessions);
}

export async function POST(req) {
	await initDb();
	const { type, durationSeconds } = await req.json();
	await run(
		"INSERT INTO pomodoro_sessions (type, duration_seconds) VALUES (?, ?)",
		[type || "work", durationSeconds || 0],
	);
	return NextResponse.json({ ok: true });
}
