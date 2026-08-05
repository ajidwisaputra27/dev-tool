'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CommandAction } from '@/types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

export default function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a: CommandAction) => a.label.toLowerCase().includes(q) || (a.group || '').toLowerCase().includes(q));
  }, [query, actions]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  function runActive() {
    const action = filtered[activeIndex];
    if (action) {
      void action.run();
      onClose();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runActive();
    }
  }

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk-box" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          className="cmdk-input"
          placeholder="ketik perintah... (add task, switch board, tema dracula, export backup JSON)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="cmdk-list">
          {filtered.length === 0 && <div className="cmdk-empty">tidak ada perintah cocok.</div>}
          {filtered.map((a, i) => (
            <div
              key={a.id}
              className={`cmdk-item ${i === activeIndex ? 'active' : ''}`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => {
                void a.run();
                onClose();
              }}
            >
              <span>{a.label}</span>
              {a.hint && <span className="hint">{a.hint}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
