"use client";

import { useRef, useState, type ChangeEvent } from "react";

interface DataManagerProps {
	onImported?: () => void;
}

export default function DataManager({ onImported }: DataManagerProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [message, setMessage] = useState("");
	const [isError, setIsError] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [pendingFile, setPendingFile] = useState<File | null>(null);

	function exportDb() {
		window.location.href = "/api/export";
	}

	function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setPendingFile(file);
		setShowConfirm(true);
		e.target.value = "";
	}

	async function confirmImport() {
		if (!pendingFile) return;
		setShowConfirm(false);
		const formData = new FormData();
		formData.append("file", pendingFile);
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
			window.location.reload();
		} catch (err) {
			setIsError(true);
			setMessage(err instanceof Error ? err.message : "gagal impor");
		} finally {
			setPendingFile(null);
		}
	}

	function cancelImport() {
		setShowConfirm(false);
		setPendingFile(null);
	}

	return (
		<div className="data-manager">
			{showConfirm && (
				<div className="confirm-overlay">
					<div className="confirm-dialog">
						<p>
							mengimpor akan mengganti semua data saat ini (board, task,
							catatan, riwayat pomodoro, dan setting) dengan isi backup JSON
							ini. lanjutkan?
						</p>
						<div className="confirm-actions">
							<button onClick={cancelImport}>batal</button>
							<button className="danger" onClick={confirmImport}>
								ya, timpa data
							</button>
						</div>
					</div>
				</div>
			)}
			<button className="icon-btn" onClick={exportDb} title="Backup JSON">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
					<polyline points="7 10 12 15 17 10"></polyline>
					<line x1="12" y1="15" x2="12" y2="3"></line>
				</svg>
			</button>
			<label
				htmlFor="import-file"
				className="icon-btn"
				title="Restore JSON"
				style={{ cursor: "pointer" }}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
					<polyline points="17 8 12 3 7 8"></polyline>
					<line x1="12" y1="3" x2="12" y2="15"></line>
				</svg>
			</label>
			<input
				id="import-file"
				ref={fileInputRef}
				type="file"
				accept=".json,application/json"
				onChange={handleFileChange}
				style={{ display: "none" }}
			/>
			{message && (
				<span className={`msg ${isError ? "error" : ""}`}>{message}</span>
			)}
		</div>
	);
}
