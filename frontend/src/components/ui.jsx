import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { siteName } from '../lib/format.js';

export function BrandMark({ className = 'h-8 w-8' }) {
  return (
    <span className={`inline-grid place-items-center rounded-[0.6rem] bg-ink text-paper ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[55%] w-[55%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="5" y1="7" x2="19" y2="7" />
        <line x1="5" y1="12" x2="15" y2="12" />
        <line x1="5" y1="17" x2="11" y2="17" />
        <circle cx="18.5" cy="17" r="1.6" fill="#e0763f" stroke="none" />
      </svg>
    </span>
  );
}

export function AppHeader({ children }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight">
          <BrandMark />
          <span className="whitespace-nowrap">{siteName}</span>
        </Link>
        <nav className="flex items-center gap-2">{children}</nav>
      </div>
    </header>
  );
}

export function BackLink({ to = '/', children = 'Back' }) {
  return (
    <Link to={to}
      className="group inline-flex items-center gap-1.5 rounded-md text-sm text-mute transition-colors hover:text-ink">
      <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      {children}
    </Link>
  );
}

const STATUS = {
  // queue
  open:      { label: 'Open',      dot: 'bg-go',     text: 'text-go',     bg: 'bg-go-soft',     live: true },
  scheduled: { label: 'Scheduled', dot: 'bg-warn',   text: 'text-warn',   bg: 'bg-warn-soft' },
  closed:    { label: 'Closed',    dot: 'bg-mute',   text: 'text-ink-2',  bg: 'bg-paper-2' },
  // entries
  waiting:   { label: 'Waiting',   dot: 'bg-mute',   text: 'text-ink-2',  bg: 'bg-paper-2' },
  called:    { label: 'Called',    dot: 'bg-signal', text: 'text-signal', bg: 'bg-signal-soft', live: true },
  served:    { label: 'Served',    dot: 'bg-go',     text: 'text-go',     bg: 'bg-go-soft' },
  skipped:   { label: 'Skipped',   dot: 'bg-stop',   text: 'text-stop',   bg: 'bg-stop-soft' },
  left:      { label: 'Left',      dot: 'bg-mute',   text: 'text-mute',   bg: 'bg-paper-2' },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, dot: 'bg-mute', text: 'text-ink-2', bg: 'bg-paper-2' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[0.6875rem] font-medium uppercase tracking-wider ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.live ? 'animate-blink' : ''}`} />
      {s.label}
    </span>
  );
}

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Notice({ tone = 'error', children, onDismiss }) {
  const tones = {
    error: 'border-stop/25 bg-stop-soft text-stop',
    info: 'border-line bg-paper-2 text-ink-2',
    success: 'border-go/25 bg-go-soft text-go',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start justify-between gap-3 rounded-[0.625rem] border px-3.5 py-3 text-sm animate-rise ${tones[tone]}`}>
      <span>{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss"
          className="-m-1 rounded p-1 opacity-70 transition-opacity hover:opacity-100">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
    </div>
  );
}

// Two-step inline confirm instead of window.confirm()
export function ConfirmButton({ onConfirm, children, confirmLabel = 'Confirm', className = 'btn btn-danger btn-sm', ...rest }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleClick = () => {
    if (armed) {
      clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 3500);
  };

  return (
    <button type="button" onClick={handleClick}
      className={`${className} ${armed ? '!bg-stop !text-white !opacity-100' : ''}`} {...rest}>
      {armed ? confirmLabel : children}
    </button>
  );
}

export function FullPageMessage({ title, body, action }) {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm animate-rise">
        <BrandMark className="mb-8 h-10 w-10" />
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {body && <p className="mt-2 text-mute">{body}</p>}
        {action && <div className="mt-8">{action}</div>}
      </div>
    </main>
  );
}

export function QueueSkeleton() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-5 py-10 sm:px-8" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-10 w-2/3 max-w-md" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map(i => <div key={i} className="skeleton h-24" />)}
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-14" />)}
      </div>
    </main>
  );
}
