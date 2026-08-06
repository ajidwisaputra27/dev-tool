import { NextResponse } from "next/server";
import { initDb, query, run, batch } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
	await initDb();
	const { id: rawId } = await params;
	const id = Number(rawId);
	if (!Number.isInteger(id)) {
		return NextResponse.json(
			{ error: "id playlist tidak valid" },
			{ status: 400 },
		);
	}

	const body = await req.json();
	const active = Boolean(body.active);
	const link = typeof body.link === "string" ? body.link.trim() : null;
	const name = typeof body.name === "string" ? body.name.trim() : null;

	const stmts = [];
	const updates = [];
	const values = [];
	if (link) {
		updates.push("link = ?");
		values.push(link);
	}
	if (name) {
		updates.push("name = ?");
		values.push(name);
	}
	if (updates.length > 0) {
		values.push(id);
		stmts.push({
			sql: `UPDATE spotify_playlists SET ${updates.join(", ")} WHERE id = ?`,
			args: values,
		});
	}
	if (active) {
		stmts.push({ sql: "UPDATE spotify_playlists SET is_active = 0" });
		stmts.push({
			sql: "UPDATE spotify_playlists SET is_active = 1 WHERE id = ?",
			args: [id],
		});
	}

	if (stmts.length > 0) {
		await batch(stmts);
	}

	const [playlist] = await query(
		"SELECT * FROM spotify_playlists WHERE id = ?",
		[id],
	);
	return NextResponse.json(playlist);
}

export async function DELETE(req, { params }) {
	await initDb();
	const { id: rawId } = await params;
	const id = Number(rawId);
	if (!Number.isInteger(id)) {
		return NextResponse.json(
			{ error: "id playlist tidak valid" },
			{ status: 400 },
		);
	}

	await run("DELETE FROM spotify_playlists WHERE id = ?", [id]);
	return NextResponse.json({ ok: true });
}
