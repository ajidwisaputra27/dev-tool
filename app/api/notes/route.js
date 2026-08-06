import { NextResponse } from "next/server";
import { initDb, query, run } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET(req) {
	await initDb();
	const { searchParams } = new URL(req.url);
	const boardId = searchParams.get("boardId");
	const [row] = await query("SELECT * FROM notes WHERE board_id = ?", [
		boardId,
	]);
	return NextResponse.json(row || { board_id: Number(boardId), content: "" });
}

export async function PUT(req) {
	await initDb();
	const { boardId, content } = await req.json();
	await run(
		`INSERT INTO notes (board_id, content) VALUES (?, ?)
     ON CONFLICT(board_id) DO UPDATE SET content = excluded.content`,
		[boardId, content],
	);
	return NextResponse.json({ ok: true });
}
