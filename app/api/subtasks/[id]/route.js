import { NextResponse } from "next/server";
import { initDb, run } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
	await initDb();
	const { id: rawId } = await params;
	const id = Number(rawId);
	if (!Number.isInteger(id)) {
		return NextResponse.json(
			{ error: "id subtask tidak valid" },
			{ status: 400 },
		);
	}
	const { done } = await req.json();
	await run("UPDATE subtasks SET done = ? WHERE id = ?", [done ? 1 : 0, id]);
	return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
	await initDb();
	const { id: rawId } = await params;
	const id = Number(rawId);
	if (!Number.isInteger(id)) {
		return NextResponse.json(
			{ error: "id subtask tidak valid" },
			{ status: 400 },
		);
	}
	await run("DELETE FROM subtasks WHERE id = ?", [id]);
	return NextResponse.json({ ok: true });
}
