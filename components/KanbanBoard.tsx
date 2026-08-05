"use client";

import { useRef, useState } from "react";
import type { Subtask, Task, TaskStatus } from "@/types";

export const STATUSES: TaskStatus[] = ["backlog", "progress", "review", "done"];
export const STATUS_LABEL: Record<TaskStatus, string> = {
	backlog: "backlog",
	progress: "in progress",
	review: "review",
	done: "done",
};

function isOverdue(due: string | null | undefined, status: TaskStatus) {
	if (!due || status === "done") return false;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return new Date(due) < today;
}

function formatDue(due: string | null | undefined) {
	if (!due) return null;
	const d = new Date(due);
	return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

interface TaskEditModalProps {
	task: Task;
	onSave: (id: number, patch: Partial<Task>) => void;
	onClose: () => void;
}

function TaskEditModal({ task, onSave, onClose }: TaskEditModalProps) {
	const [text, setText] = useState(task.text);
	const [tag, setTag] = useState(
		task.tag
			? task.tag
					.split(",")
					.map((t) => t.trim())
					.join(" ")
			: "",
	);
	const [priority, setPriority] = useState<Task["priority"]>(task.priority);
	const [due, setDue] = useState(task.due || "");
	const [estimate, setEstimate] = useState(task.estimate || "");
	const [gitLink, setGitLink] = useState(task.git_link || "");
	const [status, setStatus] = useState<TaskStatus>(task.status);

	function submit(e: React.FormEvent) {
		e.preventDefault();
		const rawTags = tag
			.trim()
			.split(/\s+/)
			.filter((t) => t.startsWith("#") && t.length > 1);
		onSave(task.id, {
			text: text.trim() || task.text,
			tag: rawTags.length > 0 ? rawTags.join(",") : null,
			priority,
			due: due || null,
			estimate: estimate.trim() || null,
			git_link: gitLink.trim() || null,
			status,
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
					<span>edit task</span>
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
								<label>status</label>
								<select
									value={status}
									onChange={(e) => setStatus(e.target.value as TaskStatus)}
								>
									{STATUSES.map((s) => (
										<option key={s} value={s}>
											{STATUS_LABEL[s]}
										</option>
									))}
								</select>
							</div>
						</div>
						<div style={{ display: "flex", gap: 8 }}>
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
							simpan
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

interface TaskCardProps {
	task: Task;
	onMove: (id: number, status: TaskStatus) => void;
	onDelete: (id: number) => void;
	onEdit: (id: number, patch: Partial<Task>) => void;
	onAddSubtask: (taskId: number, text: string) => void;
	onToggleSubtask: (subtaskId: number, done: boolean, taskId: number) => void;
	onDeleteSubtask: (subtaskId: number, taskId: number) => void;
}

function TaskCard({
	task,
	onMove,
	onDelete,
	onEdit,
	onAddSubtask,
	onToggleSubtask,
	onDeleteSubtask,
}: TaskCardProps) {
	const [subtaskText, setSubtaskText] = useState("");
	const [editOpen, setEditOpen] = useState(false);
	const idx = STATUSES.indexOf(task.status);
	const overdue = isOverdue(task.due, task.status);
	const dueLabel = formatDue(task.due);
	const subtasks = task.subtasks || [];
	const doneCount = subtasks.filter((s: Subtask) => !!s.done).length;

	function submitSubtask(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!subtaskText.trim()) return;
		onAddSubtask(task.id, subtaskText.trim());
		setSubtaskText("");
	}

	return (
		<>
			{editOpen && (
				<TaskEditModal
					task={task}
					onSave={onEdit}
					onClose={() => setEditOpen(false)}
				/>
			)}
			<div
				className="card"
				draggable
				onDragStart={(e) =>
					e.dataTransfer?.setData("text/plain", String(task.id))
				}
			>
				<div className="txt">{task.text}</div>
				<div className="meta">
					<span className={`pill pr-${task.priority}`}>{task.priority}</span>
					{dueLabel && (
						<span className={`pill due ${overdue ? "overdue" : ""}`}>
							{overdue ? "overdue · " : ""}
							{dueLabel}
						</span>
					)}
					{task.estimate && <span className="pill est">{task.estimate}</span>}
					{task.tag &&
						task.tag
							.split(",")
							.map((t) => t.trim())
							.filter(Boolean)
							.map((t) => (
								<span key={t} className="pill tag">
									{t}
								</span>
							))}
					{task.git_link && (
						<a
							className="pill git"
							href={task.git_link}
							target="_blank"
							rel="noreferrer"
						>
							pr/branch ↗
						</a>
					)}
				</div>

				<div className="subtasks">
					{subtasks.map((s: Subtask) => (
						<div key={s.id} className={`subtask-row ${s.done ? "done" : ""}`}>
							<input
								type="checkbox"
								checked={!!s.done}
								onChange={(e) =>
									onToggleSubtask(s.id, e.target.checked, task.id)
								}
							/>
							<span className="stxt">{s.text}</span>
							<button
								className="sdel"
								onClick={() => onDeleteSubtask(s.id, task.id)}
								aria-label="hapus subtask"
							>
								✕
							</button>
						</div>
					))}
					<form className="subtask-add" onSubmit={submitSubtask}>
						<input
							type="text"
							placeholder="+ subtask"
							value={subtaskText}
							onChange={(e) => setSubtaskText(e.target.value)}
							maxLength={100}
						/>
						<button type="submit">add</button>
					</form>
					{subtasks.length > 0 && (
						<span className="subtask-progress">
							{doneCount}/{subtasks.length} selesai
						</span>
					)}
				</div>

				<div className="card-foot">
					<div className="card-move">
						<button
							disabled={idx === 0}
							onClick={() => onMove(task.id, STATUSES[idx - 1])}
							aria-label="pindah kiri"
						>
							‹
						</button>
						<button
							disabled={idx === STATUSES.length - 1}
							onClick={() => onMove(task.id, STATUSES[idx + 1])}
							aria-label="pindah kanan"
						>
							›
						</button>
					</div>
					<div style={{ display: "flex", gap: 4 }}>
						<button
							className="edit"
							onClick={() => setEditOpen(true)}
							aria-label="edit task"
						>
							✎
						</button>
						<button
							className="del"
							onClick={() => onDelete(task.id)}
							aria-label="hapus task"
						>
							✕
						</button>
					</div>
				</div>
			</div>
		</>
	);
}

interface KanbanBoardProps {
	tasks: Task[];
	onMove: (id: number, status: TaskStatus) => void;
	onDelete: (id: number) => void;
	onEdit: (id: number, patch: Partial<Task>) => void;
	onAddSubtask: (taskId: number, text: string) => void;
	onToggleSubtask: (subtaskId: number, done: boolean, taskId: number) => void;
	onDeleteSubtask: (subtaskId: number, taskId: number) => void;
}

export default function KanbanBoard({
	tasks,
	onMove,
	onDelete,
	onEdit,
	onAddSubtask,
	onToggleSubtask,
	onDeleteSubtask,
}: KanbanBoardProps) {
	const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

	return (
		<div className="kanban">
			{STATUSES.map((status) => {
				const colTasks = tasks.filter((t) => t.status === status);
				return (
					<div
						key={status}
						className={`column ${dragOverCol === status ? "dragover" : ""}`}
						onDragOver={(e) => {
							e.preventDefault();
							setDragOverCol(status);
						}}
						onDragLeave={() => setDragOverCol(null)}
						onDrop={(e) => {
							e.preventDefault();
							setDragOverCol(null);
							const id = Number(e.dataTransfer.getData("text/plain"));
							if (id) onMove(id, status);
						}}
					>
						<div className="column-head">
							<span>{STATUS_LABEL[status]}</span>
							<span className="count">{colTasks.length}</span>
						</div>
						<div className="column-cards">
							{colTasks.length === 0 && (
								<div className="column-empty">// kosong</div>
							)}
							{colTasks.map((t) => (
								<TaskCard
									key={t.id}
									task={t}
									onMove={onMove}
									onDelete={onDelete}
									onEdit={onEdit}
									onAddSubtask={onAddSubtask}
									onToggleSubtask={onToggleSubtask}
									onDeleteSubtask={onDeleteSubtask}
								/>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}
