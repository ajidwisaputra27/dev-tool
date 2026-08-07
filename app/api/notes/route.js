import { NextResponse } from "next/server";
import { initDb, query, run } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET(req) {
	await initDb();
	const { searchParams } = new URL(req.url);
	const boardId = searchParams.get("boardId");
	const rows = await query(
		"SELECT * FROM notes WHERE board_id = ? ORDER BY created_at ASC",
		[boardId],
	);
	return NextResponse.json(rows);
}

export async function POST(req) {
	await initDb();
	const { boardId, title, content } = await req.json();
	const r = await run(
		`INSERT INTO notes (board_id, title, content) VALUES (?, ?, ?)`,
		[boardId, title || "Untitled", content || ""],
	);
	const [row] = await query("SELECT * FROM notes WHERE id = ?", [
		r.lastInsertRowid,
	]);
	return NextResponse.json(row);
}
