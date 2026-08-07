"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	Board,
	CommandAction,
	PomodoroSession,
	SettingsMap,
	SpotifyPlaylist,
	Task,
	TaskStatus,
	Note,
} from "@/types";
import KanbanBoard from "./KanbanBoard";
import SpotifyPanel from "./SpotifyPanel";
import Scratchpad from "./Scratchpad";
import DataManager from "./DataManager";
import CommandPalette from "./CommandPalette";
import WorldClocks from "./WorldClocks";

const THEMES = ["ink", "dracula", "monokai", "solarized"] as const;

type Theme = (typeof THEMES)[number];

function AddBoardModal({
	onAdd,
	onClose,
}: {
	onAdd: (name: string) => void;
	onClose: () => void;
}) {
	const [name, setName] = useState("");
	function submit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		onAdd(name.trim());
		onClose();
	}
	return (
		<div
			className="modal-overlay"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className="modal-box">
				<div className="modal-head">
					<span>board baru</span>
					<button onClick={onClose}>✕</button>
				</div>
				<form onSubmit={submit}>
					<div className="modal-body">
						<div className="modal-field">
							<label>nama board</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="project baru"
								maxLength={40}
								autoFocus
							/>
						</div>
					</div>
					<div className="modal-foot">
						<button type="button" onClick={onClose}>
							batal
						</button>
						<button type="submit" className="primary">
							buat board
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function AddTaskModal({
	onAdd,
	onClose,
}: {
	onAdd: (data: {
		text: string;
		tag: string | null;
		priority: Task["priority"];
		due: string | null;
		estimate: string | null;
		gitLink: string | null;
	}) => void;
	onClose: () => void;
}) {
	const [text, setText] = useState("");
	const [tag, setTag] = useState("");
	const [priority, setPriority] = useState<Task["priority"]>("med");
	const [due, setDue] = useState("");
	const [estimate, setEstimate] = useState("");
	const [gitLink, setGitLink] = useState("");

	function submit(e: React.FormEvent) {
		e.preventDefault();
		const raw = text.trim();
		if (!raw) return;
		// support inline #tags in text OR separate tag field
		const inlineTags = raw.match(/#[\w-]+/g) || [];
		const fieldTags = tag
			.trim()
			.split(/\s+/)
			.filter((t) => t.startsWith("#") && t.length > 1);
		const allTags = [...new Set([...inlineTags, ...fieldTags])];
		onAdd({
			text: raw.replace(/#[\w-]+/g, "").trim() || raw,
			tag: allTags.length > 0 ? allTags.join(",") : null,
			priority,
			due: due || null,
			estimate: estimate.trim() || null,
			gitLink: gitLink.trim() || null,
		});
		onClose();
	}

	return (
		<div
			className="modal-overlay"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className="modal-box">
				<div className="modal-head">
					<span>task baru</span>
					<button onClick={onClose}>✕</button>
				</div>
				<form onSubmit={submit}>
					<div className="modal-body">
						<div className="modal-field">
							<label>teks task</label>
							<input
								type="text"
								value={text}
								onChange={(e) => setText(e.target.value)}
								placeholder="refactor auth middleware"
								maxLength={140}
								autoFocus
							/>
						</div>
						<div className="modal-field">
							<label>tag (pisah spasi, contoh: #backend #api)</label>
							<input
								type="text"
								value={tag}
								onChange={(e) => setTag(e.target.value)}
								placeholder="#backend #api"
							/>
						</div>
						<div style={{ display: "flex", gap: 8 }}>
							<div className="modal-field" style={{ flex: 1 }}>
								<label>priority</label>
								<select
									value={priority}
									onChange={(e) =>
										setPriority(e.target.value as Task["priority"])
									}
								>
									<option value="low">low</option>
									<option value="med">med</option>
									<option value="high">high</option>
								</select>
							</div>
							<div className="modal-field" style={{ flex: 1 }}>
								<label>due date</label>
								<input
									type="date"
									value={due}
									onChange={(e) => setDue(e.target.value)}
								/>
							</div>
							<div className="modal-field" style={{ flex: 1 }}>
								<label>estimasi</label>
								<input
									type="text"
									value={estimate}
									onChange={(e) => setEstimate(e.target.value)}
									placeholder="2h"
									maxLength={6}
								/>
							</div>
						</div>
						<div className="modal-field">
							<label>link PR / branch</label>
							<input
								type="text"
								value={gitLink}
								onChange={(e) => setGitLink(e.target.value)}
								placeholder="https://github.com/..."
							/>
						</div>
					</div>
					<div className="modal-foot">
						<button type="button" onClick={onClose}>
							batal
						</button>
						<button type="submit" className="primary">
							tambah task
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function parseTagsFromText(text: string): string[] {
	return text.match(/#[\w-]+/g) || [];
}

function parseTagFromText(text: string) {
	const tags = parseTagsFromText(text);
	return tags.length > 0 ? tags.join(",") : null;
}

function priorityRank(p: Task["priority"]) {
	return { high: 0, med: 1, low: 2 }[p] ?? 1;
}

function processTasks(
	tasks: Task[],
	{
		search,
		sortBy,
		filterPriority,
		filterTag,
	}: {
		search: string;
		sortBy: string;
		filterPriority: string;
		filterTag: string;
	},
) {
	let result = [...tasks];
	if (filterPriority !== "all") {
		result = result.filter((t) => t.priority === filterPriority);
	}
	if (filterTag !== "all") {
		result = result.filter((t) =>
			(t.tag || "")
				.split(",")
				.map((s) => s.trim())
				.includes(filterTag),
		);
	}
	if (search.trim()) {
		const q = search.trim().toLowerCase();
		result = result.filter(
			(t) =>
				t.text.toLowerCase().includes(q) ||
				(t.tag || "").toLowerCase().includes(q),
		);
	}
	if (sortBy === "priority") {
		result = [...result].sort(
			(a, b) => priorityRank(a.priority) - priorityRank(b.priority),
		);
	} else if (sortBy === "due") {
		result = [...result].sort((a, b) => {
			if (!a.due && !b.due) return 0;
			if (!a.due) return 1;
			if (!b.due) return -1;
			return new Date(a.due).getTime() - new Date(b.due).getTime();
		});
	}
	return result;
}

export default function Dashboard() {
	const [boards, setBoards] = useState<Board[]>([]);
	const [currentBoardId, setCurrentBoardId] = useState<number | null>(null);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [notes, setNotes] = useState<Note[]>([]);
	const [settings, setSettings] = useState<SettingsMap>({});
	const [sessions, setSessions] = useState<PomodoroSession[]>([]);
	const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
	const [currentPlaylistId, setCurrentPlaylistId] = useState<number | null>(
		null,
	);
	const [theme, setTheme] = useState<Theme>("ink");
	const [clock, setClock] = useState("");
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [addBoardOpen, setAddBoardOpen] = useState(false);

	const [search, setSearch] = useState("");
	const [sortBy, setSortBy] = useState("none");
	const [filterPriority, setFilterPriority] = useState("all");
	const [filterTag, setFilterTag] = useState("all");
	const [addTaskOpen, setAddTaskOpen] = useState(false);
	const [filterOpen, setFilterOpen] = useState(false);

	const searchInputRef = useRef<HTMLInputElement | null>(null);
	const filterRef = useRef<HTMLDivElement | null>(null);

	const loadEverything = useCallback(async () => {
		const [boardsRes, settingsRes, playlistsRes, sessionsRes] =
			await Promise.all([
				fetch("/api/boards").then((r) => r.json()) as Promise<Board[]>,
				fetch("/api/settings").then((r) => r.json()) as Promise<SettingsMap>,
				fetch("/api/playlists").then((r) => r.json()) as Promise<
					SpotifyPlaylist[]
				>,
				fetch("/api/pomodoro").then((r) => r.json()) as Promise<
					PomodoroSession[]
				>,
			]);
		setBoards(boardsRes);
		setSettings(settingsRes);
		setSessions(sessionsRes);
		setPlaylists(playlistsRes);
		if (settingsRes.theme) setTheme(settingsRes.theme as Theme);
		const activePlaylist = playlistsRes.find((playlist) => playlist.is_active);
		if (activePlaylist) {
			setCurrentPlaylistId(activePlaylist.id);
			setSettings((prev) => ({
				...prev,
				spotifyPlaylistId: String(activePlaylist.id),
				spotifyLink: activePlaylist.link,
			}));
			void fetch("/api/settings", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					spotifyPlaylistId: String(activePlaylist.id),
					spotifyLink: activePlaylist.link,
				}),
			});
		} else if (settingsRes.spotifyPlaylistId) {
			const nextPlaylistId = Number(settingsRes.spotifyPlaylistId);
			if (Number.isInteger(nextPlaylistId))
				setCurrentPlaylistId(nextPlaylistId);
		}
		if (boardsRes.length > 0)
			setCurrentBoardId((prev) => prev ?? boardsRes[0].id);
	}, []);

	useEffect(() => {
		void loadEverything();
	}, [loadEverything]);

	const loadBoardData = useCallback(async (boardId: number | null) => {
		if (!boardId) return;
		const [tasksRes, notesRes] = await Promise.all([
			fetch(`/api/tasks?boardId=${boardId}`).then((r) => r.json()) as Promise<
				Task[]
			>,
			fetch(`/api/notes?boardId=${boardId}`).then((r) => r.json()) as Promise<
				Note[]
			>,
		]);
		setTasks(tasksRes);
		setNotes(notesRes);
	}, []);

	useEffect(() => {
		void loadBoardData(currentBoardId);
	}, [currentBoardId, loadBoardData]);

	useEffect(() => {
		const id = window.setInterval(
			() => setClock(new Date().toLocaleTimeString("en-GB")),
			1000,
		);
		setClock(new Date().toLocaleTimeString("en-GB"));
		return () => window.clearInterval(id);
	}, []);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
	}, [theme]);

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setPaletteOpen((v) => !v);
				return;
			}
			const tag = document.activeElement?.tagName;
			if (
				e.key === "n" &&
				tag !== "INPUT" &&
				tag !== "TEXTAREA" &&
				tag !== "SELECT"
			) {
				e.preventDefault();
				setAddTaskOpen(true);
			}
			if (
				e.key === "/" &&
				tag !== "INPUT" &&
				tag !== "TEXTAREA" &&
				tag !== "SELECT"
			) {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	useEffect(() => {
		if (!filterOpen) return;
		function onClickOutside(e: MouseEvent) {
			if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
				setFilterOpen(false);
			}
		}
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, [filterOpen]);

	function saveSettings(patch: SettingsMap) {
		const merged = { ...settings, ...patch };
		setSettings(merged);
		void fetch("/api/settings", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(patch),
		});
	}

	function changeTheme(next: Theme) {
		setTheme(next);
		saveSettings({ theme: next });
	}

	async function addBoard() {
		setAddBoardOpen(true);
	}

	async function doAddBoard(name: string) {
		const res = await fetch("/api/boards", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name }),
		});
		const board = (await res.json()) as Board;
		setBoards((prev) => [...prev, board]);
		setCurrentBoardId(board.id);
	}

	async function deleteBoard(id: number) {
		if (boards.length <= 1) return;
		const ok = window.confirm(
			"hapus board ini beserta semua task di dalamnya?",
		);
		if (!ok) return;
		await fetch(`/api/boards/${id}`, { method: "DELETE" });
		const remaining = boards.filter((b) => b.id !== id);
		setBoards(remaining);
		if (currentBoardId === id) setCurrentBoardId(remaining[0]?.id || null);
	}

	async function addTask(data: {
		text: string;
		tag: string | null;
		priority: Task["priority"];
		due: string | null;
		estimate: string | null;
		gitLink: string | null;
	}) {
		if (!currentBoardId) return;
		const res = await fetch("/api/tasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ boardId: currentBoardId, ...data }),
		});
		const task = (await res.json()) as Task;
		setTasks((prev) => [...prev, task]);
	}

	async function moveTask(id: number, status: TaskStatus) {
		setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
		await fetch(`/api/tasks/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status }),
		});
	}

	async function deleteTask(id: number) {
		setTasks((prev) => prev.filter((t) => t.id !== id));
		await fetch(`/api/tasks/${id}`, { method: "DELETE" });
	}

	async function editTask(id: number, patch: Partial<Task>) {
		setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
		await fetch(`/api/tasks/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				text: patch.text,
				tag: patch.tag,
				priority: patch.priority,
				due: patch.due,
				estimate: patch.estimate,
				git_link: patch.git_link,
				status: patch.status,
			}),
		});
	}

	async function addSubtask(taskId: number, text: string) {
		const res = await fetch("/api/subtasks", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ taskId, text }),
		});
		const subtask = (await res.json()) as NonNullable<Task["subtasks"]>[number];
		setTasks((prev) =>
			prev.map((t) =>
				t.id === taskId
					? { ...t, subtasks: [...(t.subtasks || []), subtask] }
					: t,
			),
		);
	}

	async function toggleSubtask(
		subtaskId: number,
		done: boolean,
		taskId: number,
	) {
		setTasks((prev) =>
			prev.map((t) =>
				t.id === taskId
					? {
							...t,
							subtasks: (t.subtasks || []).map((s) =>
								s.id === subtaskId ? { ...s, done } : s,
							),
						}
					: t,
			),
		);
		await fetch(`/api/subtasks/${subtaskId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ done }),
		});
	}

	async function deleteSubtask(subtaskId: number, taskId: number) {
		setTasks((prev) =>
			prev.map((t) =>
				t.id === taskId
					? {
							...t,
							subtasks: (t.subtasks || []).filter((s) => s.id !== subtaskId),
						}
					: t,
			),
		);
		await fetch(`/api/subtasks/${subtaskId}`, { method: "DELETE" });
	}

	function saveNotes(id: number, content: string) {
		setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
		void fetch(`/api/notes/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content }),
		});
	}

	async function addNote() {
		if (!currentBoardId) return;
		const res = await fetch("/api/notes", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				boardId: currentBoardId,
				title: "new.md",
				content: "",
			}),
		});
		const note = await res.json();
		setNotes((prev) => [...prev, note]);
	}

	async function deleteNote(id: number) {
		setNotes((prev) => prev.filter((n) => n.id !== id));
		await fetch(`/api/notes/${id}`, { method: "DELETE" });
	}

	async function renameNote(id: number, title: string) {
		setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title } : n)));
		await fetch(`/api/notes/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title }),
		});
	}

	const logPomodoroSession = useCallback(
		async (type: PomodoroSession["type"], durationSeconds: number) => {
			await fetch("/api/pomodoro", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ type, durationSeconds }),
			});
			const updated = (await fetch("/api/pomodoro").then((r) =>
				r.json(),
			)) as PomodoroSession[];
			setSessions(updated);
		},
		[],
	);

	function saveSpotifyLink(link: string) {
		saveSettings({ spotifyLink: link });
	}

	function selectSpotifyPlaylist(playlist: SpotifyPlaylist) {
		setCurrentPlaylistId(playlist.id);
		void fetch(`/api/playlists/${playlist.id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ active: true }),
		});
		saveSettings({
			spotifyPlaylistId: String(playlist.id),
			spotifyLink: playlist.link,
		});
	}

	const allTags = useMemo(() => {
		const set = new Set<string>();
		tasks.forEach((t) => {
			if (t.tag) t.tag.split(",").forEach((tag) => set.add(tag.trim()));
		});
		return Array.from(set).sort();
	}, [tasks]);

	const visibleTasks = useMemo(
		() => processTasks(tasks, { search, sortBy, filterPriority, filterTag }),
		[tasks, search, sortBy, filterPriority, filterTag],
	);
	const activeCount = tasks.filter((t) => t.status !== "done").length;

	const paletteActions = useMemo<CommandAction[]>(() => {
		const actions: CommandAction[] = [
			{
				id: "add-task",
				label: "tambah task baru",
				hint: "n",
				group: "task",
				run: () => setAddTaskOpen(true),
			},
			{
				id: "search",
				label: "cari task",
				hint: "/",
				group: "task",
				run: () => searchInputRef.current?.focus(),
			},
			{
				id: "new-board",
				label: "buat board baru",
				group: "board",
				run: () => void addBoard(),
			},
			{
				id: "export",
				label: "export backup JSON",
				group: "data",
				run: () => {
					window.location.href = "/api/export";
				},
			},
		];
		boards.forEach((b) => {
			actions.push({
				id: `board-${b.id}`,
				label: `pindah ke board: ${b.name}`,
				group: "board",
				run: () => setCurrentBoardId(b.id),
			});
		});
		THEMES.forEach((t) => {
			actions.push({
				id: `theme-${t}`,
				label: `ganti tema: ${t}`,
				group: "tema",
				run: () => changeTheme(t),
			});
		});
		return actions;
	}, [boards]);

	return (
		<div className="wrap">
			{addTaskOpen && (
				<AddTaskModal onAdd={addTask} onClose={() => setAddTaskOpen(false)} />
			)}
			{addBoardOpen && (
				<AddBoardModal
					onAdd={doAddBoard}
					onClose={() => setAddBoardOpen(false)}
				/>
			)}
			<div className="titlebar">
				<div className="titlebar-left">
					<div className="dots">
						<span className="dot r" />
						<span className="dot a" />
						<span className="dot t" />
					</div>
					<span className="fname">~/workspace/dashboard.dev</span>
					<div className="board-switch">
						{boards.map((b) => (
							<button
								key={b.id}
								className={`board-chip ${b.id === currentBoardId ? "active" : ""}`}
								onClick={() => setCurrentBoardId(b.id)}
								onDoubleClick={() => deleteBoard(b.id)}
								title="klik dua kali untuk hapus board"
							>
								{b.name}
							</button>
						))}
						<button className="board-chip add" onClick={addBoard}>
							+ board
						</button>
					</div>
				</div>
				<div className="status">
					<DataManager onImported={loadEverything} />
					<div className="theme-dropdown-wrap" style={{ position: "relative" }}>
						<button className="icon-btn" title="Change Theme">
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
								<circle cx="12" cy="12" r="5"></circle>
								<line x1="12" y1="1" x2="12" y2="3"></line>
								<line x1="12" y1="21" x2="12" y2="23"></line>
								<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
								<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
								<line x1="1" y1="12" x2="3" y2="12"></line>
								<line x1="21" y1="12" x2="23" y2="12"></line>
								<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
								<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
							</svg>
						</button>
						<select
							className="theme-select-hidden"
							value={theme}
							onChange={(e) => {
								const nextTheme = e.target.value as Theme;
								if ((THEMES as readonly string[]).includes(nextTheme))
									changeTheme(nextTheme);
							}}
							title="Change Theme"
						>
							{THEMES.map((t) => (
								<option key={t} value={t}>
									{t}
								</option>
							))}
						</select>
					</div>
					<button
						className="icon-btn"
						onClick={() => setPaletteOpen(true)}
						title="Command Palette"
					>
						⌘k
					</button>
					<div className="clock-wrap">
						<span className="clock">{clock}</span>
						<div className="clock-hover-popup">
							<WorldClocks />
						</div>
					</div>
				</div>
			</div>

			<div className="body-wrap">
				<div className="panel">
					<div className="panel-head">
						<span className="path">
							<span className="file">todo.board</span> — {tasks.length} tasks ·{" "}
							{activeCount} aktif
						</span>
					</div>

					<div className="filter-bar">
						<input
							ref={searchInputRef}
							type="text"
							placeholder="cari task atau tag..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<div className="filter-popup-wrap" ref={filterRef}>
							<button
								className={`filter-icon-btn ${filterOpen || filterPriority !== "all" || filterTag !== "all" || sortBy !== "none" ? "active" : ""}`}
								onClick={() => setFilterOpen((v) => !v)}
								title="filter & sort"
							>
								<svg
									width="14"
									height="14"
									viewBox="0 0 16 16"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									aria-hidden="true"
								>
									<path
										d="M1 3h14M3.5 7h9M6 11h4"
										stroke="currentColor"
										strokeWidth="1.8"
										strokeLinecap="round"
									/>
								</svg>
							</button>
							{filterOpen && (
								<div className="filter-popup">
									<label>priority</label>
									<select
										value={filterPriority}
										onChange={(e) => setFilterPriority(e.target.value)}
									>
										<option value="all">semua</option>
										<option value="high">high</option>
										<option value="med">med</option>
										<option value="low">low</option>
									</select>
									<label>tag</label>
									<select
										value={filterTag}
										onChange={(e) => setFilterTag(e.target.value)}
									>
										<option value="all">semua</option>
										{allTags.map((tag) => (
											<option key={tag} value={tag}>
												{tag}
											</option>
										))}
									</select>
									<label>urutan</label>
									<select
										value={sortBy}
										onChange={(e) => setSortBy(e.target.value)}
									>
										<option value="none">asli</option>
										<option value="priority">priority</option>
										<option value="due">due date</option>
									</select>
									{(filterPriority !== "all" ||
										filterTag !== "all" ||
										sortBy !== "none") && (
										<button
											className="reset-filter"
											onClick={() => {
												setFilterPriority("all");
												setFilterTag("all");
												setSortBy("none");
											}}
										>
											reset
										</button>
									)}
								</div>
							)}
						</div>
						<button
							className="add-btn"
							onClick={() => setAddTaskOpen(true)}
							disabled={!currentBoardId}
						>
							+ task baru
						</button>
					</div>

					<KanbanBoard
						tasks={visibleTasks}
						onMove={moveTask}
						onDelete={deleteTask}
						onEdit={editTask}
						onAddSubtask={addSubtask}
						onToggleSubtask={toggleSubtask}
						onDeleteSubtask={deleteSubtask}
					/>
				</div>

				<div className="side-row">
					<SpotifyPanel
						initialLink={settings.spotifyLink || ""}
						activePlaylistId={currentPlaylistId}
						playlists={playlists}
						onPlaylistsChange={setPlaylists}
						onSelectPlaylist={selectSpotifyPlaylist}
						onSaveLink={saveSpotifyLink}
					/>
					<Scratchpad
						notes={notes}
						onSave={saveNotes}
						onAdd={addNote}
						onDelete={deleteNote}
						onRename={renameNote}
					/>
				</div>
			</div>

			<CommandPalette
				open={paletteOpen}
				onClose={() => setPaletteOpen(false)}
				actions={paletteActions}
			/>
		</div>
	);
}
