import { NextResponse } from "next/server";
import { exportBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET() {
	const backup = await exportBackup();
	const stamp = new Date().toISOString().slice(0, 10);
	return NextResponse.json(backup, {
		headers: {
			"Content-Disposition": `attachment; filename="dashboard-backup-${stamp}.json"`,
		},
	});
}
