import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppHeader, ConfirmButton, FullPageMessage, QueueSkeleton, StatusBadge } from './ui.jsx';
import { formatMinutes } from '../lib/format.js';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const wsBase = baseUrl.startsWith('http')
  ? baseUrl.replace(/^http/, 'ws')
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${baseUrl}`;

const GuestQueuePage = () => {
  const { queue_id } = useParams();
  const navigate = useNavigate();
  const [queueState, setQueueState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [removed, setRemoved] = useState(false);
  const wsRef = useRef(null);
  const isLeavingVoluntarily = useRef(false);

  // read once: the effect clears these on expiry and must not re-run (and redirect) when it does
  const [guestToken] = useState(() => localStorage.getItem('guest_token'));
  const [myEntryId] = useState(() => parseInt(localStorage.getItem('guest_entry_id')));

  useEffect(() => {
    if (!guestToken) { navigate('/join'); return; }

    fetch(`${baseUrl}/queues/state/${queue_id}`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.detail || 'Failed to load queue');
        setQueueState(data);
      })
      .catch(e => console.error('Failed to load state', e))
      .finally(() => setLoading(false));

    const ws = new WebSocket(`${wsBase}/ws/queue/${queue_id}?token=${guestToken}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data.entries) return;
      const myEntry = data.entries.find(e => e.id === myEntryId);
      // entries are soft-retained, so removal shows up as a status change, not a missing row
      const wasRemoved = !myEntry || myEntry.status === 'skipped';
      if (wasRemoved && !isLeavingVoluntarily.current) {
        isLeavingVoluntarily.current = true; // only react once
        localStorage.removeItem('guest_token');
        localStorage.removeItem('guest_entry_id');
        setRemoved(true);
        return;
      }
      setQueueState(data);
    };
    ws.onclose = (event) => {
      if (event.code === 4003) {
        // token belongs to a different queue
        navigate('/join');
        return;
      }
      if (event.code === 4001) {
        // backend rejected — token expired
        localStorage.removeItem('guest_token');
        localStorage.removeItem('guest_entry_id');
        setTokenExpired(true);
        setLoading(false);
      }
    };
    ws.onerror = (e) => console.error('WS error', e);

    return () => ws.close();
  }, [queue_id, navigate, guestToken, myEntryId]);

  const handleLeave = async () => {
    try {
      isLeavingVoluntarily.current = true; // mark before state changes
      await fetch(`${baseUrl}/queues/leave`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${guestToken}` },
      });
    } catch (e) {
      console.error('Leave failed', e);
    } finally {
      localStorage.removeItem('guest_token');
      localStorage.removeItem('guest_entry_id');
      navigate('/');
    }
  };

  if (removed) return (
    <FullPageMessage
      title="You’ve been taken off the list"
      body="Staff removed your spot, or skipped you when you were called. Ask at the counter if this looks wrong."
      action={<Link to="/join" className="btn btn-primary">Join again</Link>}
    />
  );

  if (loading) return <><AppHeader /><QueueSkeleton /></>;

  if (tokenExpired) return (
    <FullPageMessage
      title="Your ticket expired"
      body="Your spot was released from the queue. You can join again with the same code."
      action={<Link to="/join" className="btn btn-primary">Rejoin queue</Link>}
    />
  );

  if (!queueState) return (
    <FullPageMessage
      title="We couldn’t load this queue"
      body="Check your connection and refresh the page."
      action={<button onClick={() => window.location.reload()} className="btn btn-primary">Refresh</button>}
    />
  );

  const { queue, entries, stats } = queueState;
  const myEntry = entries.find(e => e.id === myEntryId);
  const current = entries.find(e => e.status === 'called');

  const waitingAhead = entries.filter(
    e => e.status === 'waiting' && e.join_number < (myEntry?.join_number ?? Infinity)
  ).length;
  const estimatedWait = Math.round((waitingAhead * queue.avg_serve_time) / 60); // seconds to minutes
  const isCalled = myEntry?.status === 'called';
  const active = entries.filter(e => e.status === 'waiting' || e.status === 'called');

  return (
    <>
      <AppHeader>
        <ConfirmButton onConfirm={handleLeave} confirmLabel="Leave the line?" className="btn btn-danger btn-sm">
          Leave queue
        </ConfirmButton>
      </AppHeader>

      <main className="mx-auto max-w-xl px-5 pb-24 pt-8 sm:pt-12">
        <div className="flex items-center justify-between gap-4 animate-rise">
          <div className="min-w-0">
            <p className="eyebrow">You’re in line at</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{queue.name}</h1>
          </div>
          <StatusBadge status={queue.status} />
        </div>

        {/* Ticket */}
        <section
          aria-live="polite"
          className={`ticket mt-6 overflow-hidden animate-rise [animation-delay:60ms] ${isCalled ? '!border-signal ring-4 ring-signal/15' : ''}`}>
          {isCalled ? (
            <div className="bg-signal px-6 py-5 text-white sm:px-8">
              <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em]">
                <span className="h-2 w-2 rounded-full bg-white animate-blink" /> It’s your turn
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight">Head to the counter now.</p>
            </div>
          ) : null}

          <div className="px-6 pb-7 pt-6 sm:px-8">
            <p className="eyebrow">Your number</p>
            <p className="mt-2 font-mono text-[5.5rem] font-medium leading-none tracking-tight tabular-nums sm:text-8xl">
              <span className="text-mute/50">Nº</span>{myEntry ? String(myEntry.join_number).padStart(3, '0') : '—'}
            </p>
            <p className="mt-3 font-medium">{myEntry?.display_name}</p>
          </div>

          <div className="ticket-perf" />

          {myEntry && !isCalled ? (
            <dl className="grid grid-cols-3 divide-x divide-line/70">
              <div className="px-4 py-5 sm:px-8">
                <dt className="eyebrow">Ahead</dt>
                <dd className="mt-1 font-mono text-2xl font-medium tabular-nums sm:text-3xl">{waitingAhead}</dd>
              </div>
              <div className="px-4 py-5 sm:px-8">
                <dt className="eyebrow">Est. wait</dt>
                <dd className="mt-1 font-mono text-2xl font-medium tabular-nums sm:text-3xl">
                  {formatMinutes(estimatedWait)}<span className="ml-1 text-sm text-mute">min</span>
                </dd>
              </div>
              <div className="px-4 py-5 sm:px-8">
                <dt className="eyebrow">Serving</dt>
                <dd className="mt-1 font-mono text-2xl font-medium tabular-nums sm:text-3xl">
                  {current ? String(current.join_number).padStart(3, '0') : '—'}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="px-6 py-5 text-sm text-mute sm:px-8">
              {isCalled ? 'Keep this page open. Staff can see you’ve been called.' : 'You are no longer in this queue.'}
            </p>
          )}
        </section>

        {queue.description && (
          <p className="mt-6 rounded-[0.875rem] bg-paper-2 px-5 py-4 text-sm leading-relaxed text-ink-2">{queue.description}</p>
        )}

        {/* Live queue — everyone sees this */}
        <section className="mt-12" aria-label="Live queue">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">The line</h2>
            <p className="font-mono text-sm tabular-nums text-mute">{stats.waiting_count} waiting</p>
          </div>
          {active.length === 0 ? (
            <p className="mt-4 rounded-[1.125rem] border border-dashed border-line-strong px-6 py-10 text-center text-sm text-mute">
              No one is waiting.
            </p>
          ) : (
            <ol className="mt-4 overflow-hidden rounded-[1.125rem] border border-line bg-card">
              {active.map((entry) => {
                const isMe = entry.id === myEntryId;
                return (
                  <li key={entry.id}
                    className={`flex items-center justify-between gap-4 border-b border-line/70 px-5 py-3 last:border-b-0
                      ${isMe ? 'bg-ink text-paper' : entry.status === 'called' ? 'bg-signal-soft/60' : ''}`}>
                    <div className="flex min-w-0 items-center gap-4">
                      <span className={`w-10 font-mono text-sm tabular-nums ${isMe ? 'text-paper/60' : 'text-mute'}`}>
                        {String(entry.join_number).padStart(3, '0')}
                      </span>
                      <span className="truncate font-medium">
                        {entry.display_name}{isMe && <span className="ml-2 font-mono text-xs text-paper/60">(you)</span>}
                      </span>
                    </div>
                    {isMe && entry.status === 'waiting'
                      ? <span className="font-mono text-xs uppercase tracking-wider text-paper/70">Waiting</span>
                      : <StatusBadge status={entry.status} />}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </>
  );
};

export default GuestQueuePage;
