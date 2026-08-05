'use client';

import type { PomodoroSession } from '@/types';

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function levelFor(count: number) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}

interface StatsHeatmapProps {
  sessions: PomodoroSession[];
}

export default function StatsHeatmap({ sessions }: StatsHeatmapProps) {
  const days: string[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(dayKey(d));
  }

  const counts: Record<string, number> = {};
  (sessions || [])
    .filter((s) => s.type === 'work')
    .forEach((s) => {
      const key = (s.completed_at || '').slice(0, 10);
      counts[key] = (counts[key] || 0) + 1;
    });

  return (
    <div className="heatmap" title="sesi fokus 14 hari terakhir">
      {days.map((key) => (
        <div key={key} className="heat-cell" data-level={levelFor(counts[key] || 0)} title={`${key}: ${counts[key] || 0} sesi`} />
      ))}
    </div>
  );
}
