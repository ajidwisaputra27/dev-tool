"use client";

import { useEffect, useRef, useState } from "react";
import type { SpotifyPlaylist } from "@/types";

function parseSpotifyLink(raw: string) {
	raw = raw.trim();
	let type: string | null = null;
	let id: string | null = null;

	let m = raw.match(
		/open\.spotify\.com\/(playlist|album|track|artist|episode|show)\/([a-zA-Z0-9]+)/,
	);
	if (m) {
		type = m[1];
		id = m[2];
	}
	if (!type) {
		m = raw.match(
			/spotify:(playlist|album|track|artist|episode|show):([a-zA-Z0-9]+)/,
		);
		if (m) {
			type = m[1];
			id = m[2];
		}
	}
	if (!type || !id) return null;
	return `https://open.spotify.com/embed/${type}/${id}`;
}

interface SpotifyPanelProps {
	initialLink?: string;
	activePlaylistId?: number | null;
	onSelectPlaylist?: (playlist: SpotifyPlaylist) => void;
	onSaveLink?: (link: string) => void;
}

type ModalMode = "add" | "edit";

export default function SpotifyPanel({
	initialLink = "",
	activePlaylistId = null,
	onSelectPlaylist,
	onSaveLink,
}: SpotifyPanelProps) {
	const [embedUrl, setEmbedUrl] = useState<string | null>(
		initialLink ? parseSpotifyLink(initialLink) : null,
	);
	const [error, setError] = useState("");
	const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
	const [activeId, setActiveId] = useState<number | null>(activePlaylistId);

	// modal
	const [modal, setModal] = useState<{
		mode: ModalMode;
		playlist?: SpotifyPlaylist;
	} | null>(null);
	const [modalUrl, setModalUrl] = useState("");
	const [modalName, setModalName] = useState("");
	const [modalErr, setModalErr] = useState("");

	// hold-to-delete
	const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		fetch("/api/playlists")
			.then((r) => r.json())
			.then((data: SpotifyPlaylist[]) => setPlaylists(data))
			.catch(() => setError("gagal memuat playlist."));
	}, []);

	// sync external activePlaylistId
	useEffect(() => {
		if (activePlaylistId === null) return;
		setActiveId(activePlaylistId);
		const p = playlists.find((x) => x.id === activePlaylistId);
		if (p) loadEmbed(p.link, p);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activePlaylistId]);

	function loadEmbed(link: string, playlist?: SpotifyPlaylist) {
		const url = parseSpotifyLink(link);
		if (!url) {
			setError("link tidak dikenali.");
			return;
		}
		setError("");
		setEmbedUrl(url);
		if (playlist) {
			setActiveId(playlist.id);
			onSelectPlaylist?.(playlist);
		}
		onSaveLink?.(link);
	}

	// single click: select & load
	function handleChipClick(playlist: SpotifyPlaylist) {
		loadEmbed(playlist.link, playlist);
	}

	// double click: open edit modal
	function handleChipDoubleClick(playlist: SpotifyPlaylist) {
		setModal({ mode: "edit", playlist });
		setModalUrl(playlist.link);
		setModalName(playlist.name);
		setModalErr("");
	}

	// tap hold: delete
	function handlePointerDown(playlist: SpotifyPlaylist) {
		holdTimer.current = setTimeout(async () => {
			holdTimer.current = null;
			const ok = window.confirm(`hapus playlist "${playlist.name}"?`);
			if (!ok) return;
			const res = await fetch(`/api/playlists/${playlist.id}`, {
				method: "DELETE",
			});
			if (!res.ok) {
				setError("gagal menghapus playlist.");
				return;
			}
			setPlaylists((prev) => prev.filter((x) => x.id !== playlist.id));
			if (activeId === playlist.id) {
				setActiveId(null);
				setEmbedUrl(null);
			}
		}, 600);
	}

	function handlePointerUp() {
		if (holdTimer.current) {
			clearTimeout(holdTimer.current);
			holdTimer.current = null;
		}
	}

	function openAddModal() {
		setModal({ mode: "add" });
		setModalUrl("");
		setModalName("");
		setModalErr("");
	}

	async function handleModalSave() {
		const url = modalUrl.trim();
		if (!parseSpotifyLink(url)) {
			setModalErr("link spotify tidak valid.");
			return;
		}

		if (modal?.mode === "add") {
			const name = modalName.trim() || "playlist baru";
			const res = await fetch("/api/playlists", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, link: url }),
			});
			const data = (await res.json()) as SpotifyPlaylist | { error?: string };
			if (!res.ok) {
				setModalErr(
					"error" in data && data.error ? data.error : "gagal simpan",
				);
				return;
			}
			const created = data as SpotifyPlaylist;
			setPlaylists((prev) => [...prev, created]);
			setModal(null);
			loadEmbed(created.link, created);
		} else if (modal?.mode === "edit" && modal.playlist) {
			const res = await fetch(`/api/playlists/${modal.playlist.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					link: url,
					name: modalName.trim() || modal.playlist.name,
				}),
			});
			const data = (await res.json()) as SpotifyPlaylist | { error?: string };
			if (!res.ok) {
				setModalErr(
					"error" in data && data.error ? data.error : "gagal update",
				);
				return;
			}
			const updated = data as SpotifyPlaylist;
			setPlaylists((prev) =>
				prev.map((x) => (x.id === updated.id ? updated : x)),
			);
			setModal(null);
			loadEmbed(updated.link, updated);
		}
	}

	const isTrack = embedUrl?.includes("/track/");

	return (
		<div className="panel">
			<div className="panel-head">
				<span className="path">
					<span className="file">now-playing.spotify</span>
				</span>
			</div>

			<div className="spotify-playlist-bar">
				{playlists.map((playlist) => (
					<button
						key={playlist.id}
						type="button"
						className={`board-chip ${playlist.id === activeId ? "active" : ""}`}
						onClick={() => handleChipClick(playlist)}
						onDoubleClick={() => handleChipDoubleClick(playlist)}
						onPointerDown={() => handlePointerDown(playlist)}
						onPointerUp={handlePointerUp}
						onPointerLeave={handlePointerUp}
						title="klik: putar • klik 2x: edit url • tahan: hapus"
					>
						{playlist.name}
					</button>
				))}
				<button type="button" className="board-chip add" onClick={openAddModal}>
					+ playlist
				</button>
			</div>

			{error && <div className="spotify-err">{error}</div>}
			{embedUrl ? (
				<div className="spotify-embed">
					<div className="spotify-preview-hint">
						{isTrack
							? "preview track • Spotify biasanya menampilkan snippet sekitar 30 detik di embed."
							: "embed player siap diputar"}
					</div>
					<iframe
						src={embedUrl}
						height={isTrack ? 152 : 352}
						title="Spotify player"
						allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
						loading="lazy"
					/>
				</div>
			) : (
				<div className="spotify-empty">
					belum ada musik.
					<br />
					<span className="kw">klik "+ playlist" untuk menambahkan</span>
				</div>
			)}

			{/* URL Modal */}
			{modal && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.6)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 9999,
					}}
					onClick={(e) => {
						if (e.target === e.currentTarget) setModal(null);
					}}
				>
					<div
						style={{
							background: "var(--bg, #1e1e2e)",
							border: "1px solid var(--border, #333)",
							borderRadius: 8,
							padding: "20px 24px",
							minWidth: 340,
							display: "flex",
							flexDirection: "column",
							gap: 10,
						}}
					>
						<div style={{ fontWeight: 600, marginBottom: 4 }}>
							{modal.mode === "add" ? "tambah playlist" : "edit playlist"}
						</div>
						<input
							type="text"
							placeholder="nama playlist"
							value={modalName}
							onChange={(e) => setModalName(e.target.value)}
							style={{ width: "100%", boxSizing: "border-box" }}
						/>
						<input
							type="text"
							placeholder="url spotify (playlist/album/track)"
							value={modalUrl}
							onChange={(e) => setModalUrl(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && void handleModalSave()}
							autoFocus
							style={{ width: "100%", boxSizing: "border-box" }}
						/>
						{modalErr && <div className="spotify-err">{modalErr}</div>}
						<div
							style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
						>
							<button
								type="button"
								className="board-chip"
								onClick={() => setModal(null)}
							>
								batal
							</button>
							<button
								type="button"
								className="board-chip active"
								onClick={() => void handleModalSave()}
							>
								simpan
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
