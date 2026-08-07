"use client";

import { useEffect, useRef, useState } from "react";

function escapeHtml(str: string) {
	return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const KEYWORDS =
	/\b(const|let|var|function|return|if|else|for|while|import|export|from|default|class|new|async|await|true|false|null|undefined|try|catch|switch|case|break)\b/g;

function highlight(text: string) {
	let html = escapeHtml(text);
	html = html.replace(/(\/\/.*$)/gm, '<span class="tok-comment">$1</span>');
	html = html.replace(
		/(`[^`]*`|"[^"]*"|'[^']*')/g,
		'<span class="tok-string">$1</span>',
	);
	html = html.replace(KEYWORDS, '<span class="tok-keyword">$1</span>');
	return html + "\n";
}

interface ScratchpadProps {
	notes: { id: number; title: string; content: string }[];
	onSave?: (id: number, content: string) => void;
	onAdd?: () => void;
	onDelete?: (id: number) => void;
	onRename?: (id: number, title: string) => void;
}

export default function Scratchpad({
	notes,
	onSave,
	onAdd,
	onDelete,
	onRename,
}: ScratchpadProps) {
	const [activeId, setActiveId] = useState<number | null>(null);
	const [content, setContent] = useState("");
	const [codeMode, setCodeMode] = useState(false);
	const [editingTitleId, setEditingTitleId] = useState<number | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const preRef = useRef<HTMLPreElement | null>(null);
	const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (notes.length > 0 && !activeId) {
			setActiveId(notes[0].id);
		} else if (notes.length === 0) {
			setActiveId(null);
			setContent("");
		}
	}, [notes, activeId]);

	useEffect(() => {
		if (activeId) {
			const note = notes.find((n) => n.id === activeId);
			if (note) setContent(note.content || "");
		}
	}, [activeId, notes]);

	function handleChange(value: string) {
		setContent(value);
		if (saveTimer.current) clearTimeout(saveTimer.current);
		if (activeId) {
			saveTimer.current = setTimeout(() => onSave?.(activeId, value), 600);
		}
	}

	function handleRenameSubmit(id: number) {
		if (editTitle.trim()) {
			onRename?.(id, editTitle.trim());
		}
		setEditingTitleId(null);
	}

	function syncScroll(e: React.UIEvent<HTMLTextAreaElement>) {
		if (preRef.current) {
			preRef.current.scrollTop = e.currentTarget.scrollTop;
			preRef.current.scrollLeft = e.currentTarget.scrollLeft;
		}
	}

	return (
		<div className="panel scratchpad-panel">
			<div className="scratchpad-layout">
				<div className="note-sidebar">
					<div className="note-sidebar-head">
						<span className="note-sidebar-label">notes</span>
						<button className="note-add-btn" onClick={onAdd} title="New note">
							+
						</button>
					</div>
					<div className="note-list">
						{notes.map((note, index) => (
							<div
								key={note.id || `note-${index}`}
								className={`note-item ${activeId === note.id ? "active" : ""}`}
								onClick={() => setActiveId(note.id)}
							>
								{editingTitleId === note.id ? (
									<input
										autoFocus
										value={editTitle}
										onChange={(e) => setEditTitle(e.target.value)}
										onBlur={() => handleRenameSubmit(note.id)}
										onKeyDown={(e) =>
											e.key === "Enter" && handleRenameSubmit(note.id)
										}
										className="note-title-input"
										onClick={(e) => e.stopPropagation()}
									/>
								) : (
									<span
										className="note-title"
										onDoubleClick={() => {
											setEditingTitleId(note.id);
											setEditTitle(note.title);
										}}
									>
										{note.title}
									</span>
								)}
								{notes.length > 1 && (
									<button
										className="note-del-btn"
										onClick={(e) => {
											e.stopPropagation();
											onDelete?.(note.id);
										}}
										title="Delete"
									>
										×
									</button>
								)}
							</div>
						))}
					</div>
				</div>
				<div className="scratchpad-editor">
					<div className="panel-body">
						{notes.length === 0 ? (
							<div
								style={{
									padding: "20px",
									textAlign: "center",
									color: "var(--text-faint)",
								}}
							>
								No notes
							</div>
						) : codeMode ? (
							<div style={{ position: "relative" }}>
								<pre
									ref={preRef}
									aria-hidden="true"
									style={{
										position: "absolute",
										inset: 0,
										margin: 0,
										padding: "10px",
										fontFamily: "'JetBrains Mono', monospace",
										fontSize: "12.5px",
										lineHeight: 1.6,
										color: "var(--text)",
										background: "var(--bg)",
										borderRadius: "4px",
										overflow: "hidden",
										whiteSpace: "pre-wrap",
										wordBreak: "break-word",
										pointerEvents: "none",
									}}
									dangerouslySetInnerHTML={{ __html: highlight(content) }}
								/>
								<textarea
									className="scratch code-mode"
									style={{
										position: "relative",
										color: "transparent",
										caretColor: "var(--text)",
										background: "transparent",
									}}
									value={content}
									onChange={(e) => handleChange(e.target.value)}
									onScroll={syncScroll}
									placeholder="// catatan cepat, snippet, ide..."
									spellCheck={false}
								/>
							</div>
						) : (
							<textarea
								className="scratch"
								value={content}
								onChange={(e) => handleChange(e.target.value)}
								placeholder="catatan cepat, snippet, atau ide sebelum lupa..."
							/>
						)}
					</div>
					<div className="scratch-foot">
						<button
							className={codeMode ? "active" : ""}
							onClick={() => setCodeMode((v) => !v)}
						>
							{codeMode ? "code mode: on" : "code mode: off"}
						</button>
						<span>{content.length} karakter</span>
					</div>
				</div>
			</div>
			<style jsx global>{`
				.tok-keyword {
					color: var(--amber);
				}
				.tok-string {
					color: var(--teal);
				}
				.tok-comment {
					color: var(--text-faint);
				}
			`}</style>
		</div>
	);
}
