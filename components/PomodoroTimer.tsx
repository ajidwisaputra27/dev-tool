"use client";

import { useEffect, useRef, useState } from "react";
import StatsHeatmap from "./StatsHeatmap";
import WorldClocks from "./WorldClocks";
import type { PomodoroSession } from "@/types";

const DURATIONS: Record<"work" | "break", number> = {
	work: 25 * 60,
	break: 5 * 60,
};

function formatTime(sec: number) {
	const m = Math.floor(sec / 60)
		.toString()
		.padStart(2, "0");
	const s = Math.floor(sec % 60)
		.toString()
		.padStart(2, "0");
	return `${m}:${s}`;
}

function playBeep() {
	try {
		const Ctx =
			window.AudioContext ||
			(
				window as Window &
					typeof globalThis & { webkitAudioContext?: typeof AudioContext }
			).webkitAudioContext;
		if (!Ctx) return;
		const ctx = new Ctx();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = 660;
		gain.gain.setValueAtTime(0.0001, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.55);
	} catch {
		// audio not available, ignore
	}
}

interface PomodoroTimerProps {
	sessions: PomodoroSession[];
	onSessionComplete?: (
		type: PomodoroSession["type"],
		durationSeconds: number,
	) => void;
}

export default function PomodoroTimer({
	sessions,
	onSessionComplete,
}: PomodoroTimerProps) {
	const [mode, setMode] = useState<"work" | "break">("work");
	const [remaining, setRemaining] = useState(DURATIONS.work);
	const [running, setRunning] = useState(false);
	const intervalRef = useRef<number | null>(null);

	useEffect(() => {
		if (
			typeof window !== "undefined" &&
			"Notification" in window &&
			Notification.permission === "default"
		) {
			Notification.requestPermission();
		}
	}, []);

	useEffect(() => {
		if (!running) return undefined;
		intervalRef.current = window.setInterval(() => {
			setRemaining((r) => {
				if (r <= 1) {
					const finishedMode = mode;
					onSessionComplete?.(finishedMode, DURATIONS[finishedMode]);
					playBeep();
					if (
						typeof window !== "undefined" &&
						"Notification" in window &&
						Notification.permission === "granted"
					) {
						new Notification(
							finishedMode === "work"
								? "sesi fokus selesai"
								: "istirahat selesai",
							{
								body:
									finishedMode === "work"
										? "saatnya istirahat sebentar."
										: "kembali fokus, semangat.",
							},
						);
					}
					const nextMode = finishedMode === "work" ? "break" : "work";
					setMode(nextMode);
					return DURATIONS[nextMode];
				}
				return r - 1;
			});
		}, 1000);
		return () => {
			if (intervalRef.current) window.clearInterval(intervalRef.current);
		};
	}, [running, mode, onSessionComplete]);

	function switchMode(next: "work" | "break") {
		setRunning(false);
		if (intervalRef.current) window.clearInterval(intervalRef.current);
		setMode(next);
		setRemaining(DURATIONS[next]);
	}

	function reset() {
		setRunning(false);
		if (intervalRef.current) window.clearInterval(intervalRef.current);
		setRemaining(DURATIONS[mode]);
	}

	const total = DURATIONS[mode];
	const pct = ((total - remaining) / total) * 100;

	const todayKey = new Date().toISOString().slice(0, 10);
	const todaySessions = (sessions || []).filter(
		(s) =>
			s.type === "work" && (s.completed_at || "").slice(0, 10) === todayKey,
	);
	const todayMinutes = Math.round(
		todaySessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60,
	);

	return (
		<div className="panel">
			<div className="panel-head">
				<span className="path">
					<span className="file">focus.timer</span>
				</span>
				<div className="timer-modes">
					<button
						className={mode === "work" ? "active" : ""}
						onClick={() => switchMode("work")}
					>
						work
					</button>
					<button
						className={mode === "break" ? "active" : ""}
						onClick={() => switchMode("break")}
					>
						break
					</button>
				</div>
			</div>
			<div className="timer-body">
				<div className="timer-display">{formatTime(remaining)}</div>
				<div className="timer-track">
					<div className="timer-fill" style={{ width: pct + "%" }} />
				</div>
				<div className="timer-label">
					{mode === "work"
						? `sesi fokus — ${DURATIONS.work / 60} menit`
						: `istirahat — ${DURATIONS.break / 60} menit`}
				</div>
				<div className="timer-controls">
					<button
						className="primary"
						onClick={() => setRunning(true)}
						disabled={running}
					>
						start
					</button>
					<button onClick={() => setRunning(false)} disabled={!running}>
						pause
					</button>
					<button onClick={reset}>reset</button>
				</div>
				<div className="timer-stats">
					<span>
						sesi hari ini: <b>{todaySessions.length}</b>
					</span>
					<span>
						fokus: <b>{todayMinutes}m</b>
					</span>
				</div>
			</div>
			<StatsHeatmap sessions={sessions} />
			<WorldClocks />
		</div>
	);
}
