import { NextResponse } from "next/server";
import { initDb, query, run } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function POST(req) {
	await initDb();
	const { taskId, text } = await req.json();
	if (!taskId || !text) {
		return NextResponse.json(
			{ error: "taskId dan text wajib diisi" },
			{ status: 400 },
		);
	}
	const info = await run("INSERT INTO subtasks (task_id, text) VALUES (?, ?)", [
		taskId,
		text,
	]);
	const [subtask] = await query("SELECT * FROM subtasks WHERE id = ?", [
		info.lastInsertRowid,
	]);
	return NextResponse.json(subtask);
}
