"use client";

import { useRef, useState, type ChangeEvent } from "react";

interface DataManagerProps {
	onImported?: () => void;
}

export default function DataManager({ onImported }: DataManagerProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [message, setMessage] = useState("");
	const [isError, setIsError] = useState(false);

	function exportDb() {
		window.location.href = "/api/export";
	}

	async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		const ok = window.confirm(
			"mengimpor akan mengganti semua data saat ini (board, task, catatan, riwayat pomodoro, dan setting) dengan isi backup JSON ini. lanjutkan?",
		);
		if (!ok) {
			e.target.value = "";
			return;
		}
		const formData = new FormData();
		formData.append("file", file);
		setMessage("mengimpor backup JSON...");
		setIsError(false);
		try {
			const res = await fetch("/api/import", {
				method: "POST",
				body: formData,
			});
			const data = await res.json();
			if (!res.ok)
				throw new Error((data as { error?: string }).error || "gagal impor");
			setMessage("backup JSON berhasil diimpor.");
			onImported?.();
		} catch (err) {
			setIsError(true);
			setMessage(err instanceof Error ? err.message : "gagal impor");
		} finally {
			e.target.value = "";
		}
	}

	return (
		<div className="data-manager">
			<button onClick={exportDb}>↓ export</button>
			<label htmlFor="import-file">↑ import</label>
			<input
				id="import-file"
				ref={fileInputRef}
				type="file"
				accept=".json,application/json"
				onChange={handleFileChange}
			/>
			{message && (
				<span className={`msg ${isError ? "error" : ""}`}>{message}</span>
			)}
		</div>
	);
}
