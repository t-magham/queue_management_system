import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader, BackLink, ConfirmButton, FullPageMessage, Notice, QueueSkeleton, StatusBadge } from './ui.jsx';
import { formatMinutes } from '../lib/format.js';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const wsBase = baseUrl.startsWith('http')
  ? baseUrl.replace(/^http/, 'ws')
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${baseUrl}`;

const AdminQueuePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [queueState, setQueueState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState('');
  const [copied, setCopied] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { navigate('/login'); return; }

    // initial state load
    fetch(`${baseUrl}/queues/state/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.detail || 'Failed to load queue');
        setQueueState(data);
      })
      .catch(e => { console.error('Failed to load queue state', e); setError(e.message); })
      .finally(() => setLoading(false));

    // WS — admin passes auth_token
    const ws = new WebSocket(`${wsBase}/ws/queue/${id}?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = (event) => setQueueState(JSON.parse(event.data));
    ws.onclose = (event) => {
      // 4003: token isn't valid for this queue (not the owner, or expired login)
      if (event.code === 4003) setError('You do not have access to this queue.');
    };
    ws.onerror = (e) => console.error('WS error', e);

    return () => ws.close();
  }, [id, navigate]);

  const adminAction = async (action) => {
    const token = localStorage.getItem('auth_token');
    setPending(action);
    setActionError('');
    try {
      const res = await fetch(`${baseUrl}/queues/${action}/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setActionError(err.detail || 'That action didn’t go through. Try again.');
      }
    } catch (e) {
      console.error(`Action ${action} failed`, e);
      setActionError('Couldn’t reach the server. Check your connection and try again.');
    } finally {
      setPending('');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    setActionError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${baseUrl}/queues/delete-entry/${entryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      // new state arrives over the websocket broadcast
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setActionError(err.detail || 'Couldn’t remove that person. Try again.');
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setActionError('Couldn’t reach the server. Check your connection and try again.');
    }
  };

  const copyJoinLink = async (code) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setActionError('Couldn’t copy the link. Share the code instead.');
    }
  };

  if (loading) return <><AppHeader /><QueueSkeleton /></>;

  if (error || !queueState) return (
    <FullPageMessage
      title={error || 'We couldn’t load this queue'}
      body="It may have been deleted, or you might be logged in as someone else."
      action={<button onClick={() => navigate('/dashboard')} className="btn btn-primary">Back to dashboard</button>}
    />
  );

  const { queue, entries, stats } = queueState;
  const current = entries.find(e => e.status === 'called');
  const active = entries.filter(e => e.status === 'waiting' || e.status === 'called');
  const finished = entries.filter(e => e.status !== 'waiting' && e.status !== 'called');
  const nextUp = entries.find(e => e.status === 'waiting');

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8">
        <BackLink to="/dashboard">All queues</BackLink>

        {/* Header */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6 animate-rise">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <StatusBadge status={queue.status} />
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{queue.name}</h1>
            {queue.description && <p className="mt-3 max-w-[60ch] text-mute">{queue.description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {queue.status !== 'open' && (
              <button onClick={() => adminAction('open')} disabled={!!pending} className="btn btn-quiet">
                <span className="h-2 w-2 rounded-full bg-go" /> Open queue
              </button>
            )}
            {queue.status !== 'closed' && (
              <button onClick={() => adminAction('close')} disabled={!!pending} className="btn btn-quiet">
                <span className="h-2 w-2 rounded-full bg-mute" /> Close queue
              </button>
            )}
          </div>
        </div>

        {actionError && <div className="mt-6"><Notice onDismiss={() => setActionError('')}>{actionError}</Notice></div>}

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Now serving */}
          <section className="ticket overflow-hidden animate-rise [animation-delay:60ms]" aria-label="Now serving">
            <div className="p-6 sm:p-8">
              <p className="eyebrow">Now serving</p>
              {current ? (
                <div className="mt-3">
                  <p className="font-mono text-7xl font-medium leading-none tracking-tight tabular-nums sm:text-8xl">
                    <span className="text-mute/50">Nº</span>{String(current.join_number).padStart(3, '0')}
                  </p>
                  <p className="mt-4 text-2xl font-medium tracking-tight">{current.display_name}</p>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="font-mono text-7xl font-medium leading-none tracking-tight text-line-strong sm:text-8xl">—</p>
                  <p className="mt-4 text-mute">
                    {nextUp ? `${nextUp.display_name} is next in line.` : 'No one is waiting right now.'}
                  </p>
                </div>
              )}
            </div>
            <div className="ticket-perf" />
            <div className="flex flex-wrap gap-2 p-6 sm:p-8">
              <button onClick={() => adminAction('call-next')}
                disabled={!!pending || (stats.waiting_count === 0 && !current)}
                className="btn btn-signal w-full !min-h-12 text-base sm:w-auto sm:px-8">
                {current ? 'Done · call next' : 'Call next'}
              </button>
              <button onClick={() => adminAction('recall')} disabled={!!pending || !current} className="btn btn-quiet flex-1 !min-h-12 sm:flex-none">
                Recall
              </button>
              <button onClick={() => adminAction('skip')} disabled={!!pending || !current} className="btn btn-quiet flex-1 !min-h-12 sm:flex-none">
                Skip
              </button>
            </div>
          </section>

          {/* Stats + share */}
          <div className="grid gap-6 animate-rise [animation-delay:120ms]">
            <dl className="panel grid grid-cols-3 divide-x divide-line/70">
              {[
                { label: 'Waiting', value: stats.waiting_count },
                { label: 'Served', value: stats.served_count },
                { label: 'Est. wait', value: formatMinutes(Math.round(stats.estimated_wait / 60)), unit: 'min' },
              ].map(({ label, value, unit }) => (
                <div key={label} className="p-5">
                  <dt className="eyebrow">{label}</dt>
                  <dd className="mt-2 font-mono text-3xl font-medium tabular-nums">
                    {value}{unit && <span className="ml-1 text-sm text-mute">{unit}</span>}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="panel flex flex-col justify-between gap-5 p-6">
              <div>
                <p className="eyebrow">Join code</p>
                <p className="mt-2 font-mono text-4xl font-medium tracking-[0.18em] tabular-nums">{queue.code}</p>
                <p className="mt-2 text-sm text-mute">Guests enter this on the home page, or open the link directly.</p>
              </div>
              <button onClick={() => copyJoinLink(queue.code)} className="btn btn-quiet btn-sm w-fit">
                {copied ? 'Link copied' : 'Copy join link'}
              </button>
            </div>
          </div>
        </div>

        {/* Entries */}
        <section className="mt-12" aria-label="Line">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight">In line</h2>
            <p className="font-mono text-sm tabular-nums text-mute">{active.length} active</p>
          </div>

          {entries.length === 0 ? (
            <div className="mt-4 rounded-[1.125rem] border border-dashed border-line-strong px-6 py-14 text-center">
              <p className="font-medium">The line is empty.</p>
              <p className="mt-1 text-sm text-mute">
                {queue.status === 'open' ? `Share code ${queue.code} and people will appear here as they join.` : 'Open the queue so people can join.'}
              </p>
            </div>
          ) : (
            <ul className="mt-4 overflow-hidden rounded-[1.125rem] border border-line bg-card">
              {[...active, ...finished].map((entry) => {
                // how many 'waiting' entries are ahead of this one
                const ahead = entries.filter(
                  e => e.status === 'waiting' && e.join_number < entry.join_number
                ).length;
                const estCallAfter = Math.round((ahead * queue.avg_serve_time) / 60); // seconds to minutes
                const isDone = entry.status !== 'waiting' && entry.status !== 'called';

                return (
                  <li key={entry.id}
                    className={`group flex items-center justify-between gap-4 border-b border-line/70 px-5 py-3.5 last:border-b-0 sm:px-6
                      ${entry.status === 'called' ? 'bg-signal-soft/60' : ''} ${isDone ? 'opacity-50' : ''}`}>
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="w-10 font-mono text-sm tabular-nums text-mute">{String(entry.join_number).padStart(3, '0')}</span>
                      <span className="truncate font-medium">{entry.display_name}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {entry.status === 'waiting' && (
                        <span className="hidden font-mono text-xs tabular-nums text-mute sm:inline">{ahead === 0 ? 'next' : `~${formatMinutes(estCallAfter)} min`}</span>
                      )}
                      <StatusBadge status={entry.status} />
                      {!isDone ? (
                        <ConfirmButton onConfirm={() => handleDeleteEntry(entry.id)} confirmLabel="Remove?"
                          aria-label={`Remove ${entry.display_name} from the queue`}
                          className="btn btn-danger btn-sm !min-h-8 !px-2 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100">
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </ConfirmButton>
                      ) : <span className="w-8" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
};

export default AdminQueuePage;
