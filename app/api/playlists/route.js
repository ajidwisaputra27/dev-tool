import { NextResponse } from "next/server";
import { initDb, query, run } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET() {
	await initDb();
	const playlists = await query("SELECT * FROM spotify_playlists ORDER BY id");
	return NextResponse.json(playlists);
}

export async function POST(req) {
	await initDb();
	const body = await req.json();
	const name = (body.name || "").trim();
	const link = (body.link || "").trim();
	if (!name || !link) {
		return NextResponse.json(
			{ error: "nama dan link playlist wajib diisi" },
			{ status: 400 },
		);
	}
	const info = await run(
		"INSERT INTO spotify_playlists (name, link) VALUES (?, ?)",
		[name, link],
	);
	const [playlist] = await query(
		"SELECT * FROM spotify_playlists WHERE id = ?",
		[info.lastInsertRowid],
	);
	return NextResponse.json(playlist);
}
