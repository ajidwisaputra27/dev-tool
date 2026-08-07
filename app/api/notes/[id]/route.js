import { NextResponse } from "next/server";
import { initDb, run } from "@/lib/turso";

export async function PATCH(req, { params }) {
	await initDb();
	const { id } = await params;
	const { title, content } = await req.json();

	const updates = [];
	const args = [];
	if (title !== undefined) {
		updates.push("title = ?");
		args.push(title);
	}
	if (content !== undefined) {
		updates.push("content = ?");
		args.push(content);
	}

	if (updates.length > 0) {
		args.push(id);
		await run(`UPDATE notes SET ${updates.join(", ")} WHERE id = ?`, args);
	}

	return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
	await initDb();
	const { id } = await params;
	await run("DELETE FROM notes WHERE id = ?", [id]);
	return NextResponse.json({ ok: true });
}
