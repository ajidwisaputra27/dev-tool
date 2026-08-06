import { NextResponse } from "next/server";
import { initDb, run } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function DELETE(req, { params }) {
	await initDb();
	const { id: rawId } = await params;
	const id = Number(rawId);
	if (!Number.isInteger(id)) {
		return NextResponse.json(
			{ error: "id board tidak valid" },
			{ status: 400 },
		);
	}
	await run("DELETE FROM tasks WHERE board_id = ?", [id]);
	await run("DELETE FROM notes WHERE board_id = ?", [id]);
	await run("DELETE FROM boards WHERE id = ?", [id]);
	return NextResponse.json({ ok: true });
}
