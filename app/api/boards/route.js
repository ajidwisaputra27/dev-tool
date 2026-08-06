import { NextResponse } from "next/server";
import { initDb, query, run } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET() {
	await initDb();
	const boards = await query("SELECT * FROM boards ORDER BY id");
	return NextResponse.json(boards);
}

export async function POST(req) {
	await initDb();
	const body = await req.json();
	const name = (body.name || "new board").trim() || "new board";
	const info = await run("INSERT INTO boards (name) VALUES (?)", [name]);
	await run("INSERT INTO notes (board_id, content) VALUES (?, ?)", [
		info.lastInsertRowid,
		"",
	]);
	const [board] = await query("SELECT * FROM boards WHERE id = ?", [
		info.lastInsertRowid,
	]);
	return NextResponse.json(board);
}
