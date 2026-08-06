import { NextResponse } from "next/server";
import { initDb, query, run } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET(req) {
	await initDb();
	const { searchParams } = new URL(req.url);
	const boardId = searchParams.get("boardId");
	if (!boardId) return NextResponse.json([]);

	const tasks = await query(
		"SELECT * FROM tasks WHERE board_id = ? ORDER BY position, id",
		[boardId],
	);
	const subtasks = await query(
		"SELECT * FROM subtasks WHERE task_id IN (SELECT id FROM tasks WHERE board_id = ?)",
		[boardId],
	);

	const withSubs = tasks.map((t) => ({
		...t,
		subtasks: subtasks.filter((s) => s.task_id === t.id),
	}));
	return NextResponse.json(withSubs);
}

export async function POST(req) {
	await initDb();
	const body = await req.json();
	const { boardId, text, tag, priority, due, estimate, gitLink } = body;
	if (!boardId || !text) {
		return NextResponse.json(
			{ error: "boardId dan text wajib diisi" },
			{ status: 400 },
		);
	}
	const info = await run(
		`INSERT INTO tasks (board_id, text, tag, priority, due, estimate, git_link, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'backlog')`,
		[
			boardId,
			text,
			tag || null,
			priority || "med",
			due || null,
			estimate || null,
			gitLink || null,
		],
	);
	const [task] = await query("SELECT * FROM tasks WHERE id = ?", [
		info.lastInsertRowid,
	]);
	return NextResponse.json({ ...task, subtasks: [] });
}
