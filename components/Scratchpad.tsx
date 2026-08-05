'use client';

import { useEffect, useRef, useState } from 'react';

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const KEYWORDS = /\b(const|let|var|function|return|if|else|for|while|import|export|from|default|class|new|async|await|true|false|null|undefined|try|catch|switch|case|break)\b/g;

function highlight(text: string) {
  let html = escapeHtml(text);
  html = html.replace(/(\/\/.*$)/gm, '<span class="tok-comment">$1</span>');
  html = html.replace(/(`[^`]*`|"[^"]*"|'[^']*')/g, '<span class="tok-string">$1</span>');
  html = html.replace(KEYWORDS, '<span class="tok-keyword">$1</span>');
  return html + '\n';
}

interface ScratchpadProps {
  initialContent: string;
  onSave?: (content: string) => void;
}

export default function Scratchpad({ initialContent, onSave }: ScratchpadProps) {
  const [content, setContent] = useState(initialContent || '');
  const [codeMode, setCodeMode] = useState(false);
  const preRef = useRef<HTMLPreElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setContent(initialContent || '');
  }, [initialContent]);

  function handleChange(value: string) {
    setContent(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onSave?.(value), 600);
  }

  function syncScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="path">
          <span className="file">scratch.md</span>
        </span>
      </div>
      <div className="panel-body">
        {codeMode ? (
          <div style={{ position: 'relative' }}>
            <pre
              ref={preRef}
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                margin: 0,
                padding: '10px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12.5px',
                lineHeight: 1.6,
                color: 'var(--text)',
                background: 'var(--bg)',
                borderRadius: '4px',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                pointerEvents: 'none'
              }}
              dangerouslySetInnerHTML={{ __html: highlight(content) }}
            />
            <textarea
              className="scratch code-mode"
              style={{ position: 'relative', color: 'transparent', caretColor: 'var(--text)', background: 'transparent' }}
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
        <button className={codeMode ? 'active' : ''} onClick={() => setCodeMode((v) => !v)}>
          {codeMode ? 'code mode: on' : 'code mode: off'}
        </button>
        <span>{content.length} karakter</span>
      </div>
      <style jsx global>{`
        .tok-keyword { color: var(--amber); }
        .tok-string { color: var(--teal); }
        .tok-comment { color: var(--text-faint); }
      `}</style>
    </div>
  );
}
