import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader, ConfirmButton, Notice, Spinner, StatusBadge } from './ui.jsx';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

const Dashboard = () => {
  const navigate = useNavigate();

  const [userQueues, setUserQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');

  // Form state for creating a new queue
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [newQueueDescription, setNewQueueDescription] = useState('');
  const [newAvgServeTime, setNewAvgServeTime] = useState('');   // minutes (user-facing)
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledOpenAt, setScheduledOpenAt] = useState('');
  const [scheduledCloseAt, setScheduledCloseAt] = useState('');

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/queues/dashboard`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          try {
            const data = await response.json();
            setUserQueues(data?.queues || []);
            setAuthenticated(true);
          } catch (jsonError) {
            console.error('Failed to parse server response:', jsonError);
          }
        } else {
          console.error('Session invalid');
          localStorage.removeItem('auth_token'); // remove possible fraud token
          navigate('/login');
        }
      } catch (error) {
        console.error('Network error validating session:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/');
  };

  const handleDelete = async (queueId) => {
    const token = localStorage.getItem('auth_token');
    try {
      const response = await fetch(`${baseUrl}/queues/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ queue_id: queueId }),
      });
      if (!response.ok) throw new Error();
      setUserQueues(prev => prev.filter(q => q.id !== queueId));
    } catch {
      setError('We couldn’t delete that queue. Try again.');
    }
  };

  const resetForm = () => {
    setNewQueueName('');
    setNewQueueDescription('');
    setNewAvgServeTime('');
    setIsScheduled(false);
    setScheduledOpenAt('');
    setScheduledCloseAt('');
    setShowForm(false);
  };

  const handleCreateQueue = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('auth_token');

    const payload = {
      queue_name: newQueueName,
      description: newQueueDescription || null,
      avg_serve_time: Math.round((parseFloat(newAvgServeTime) || 1) * 60), // convert min → seconds
      scheduled_open_at: isScheduled ? scheduledOpenAt : null,
      scheduled_close_at: isScheduled ? scheduledCloseAt : null,
    };

    setCreating(true);
    setError('');
    try {
      const res = await fetch(`${baseUrl}/queues/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setUserQueues(prev => [...prev, data]);
        resetForm();
      } else {
        console.error('Failed to create queue', await res.text());
        setError('We couldn’t create the queue. Check the fields and try again.');
      }
    } catch (err) {
      console.error('Network error:', err);
      setError('Couldn’t reach the server. Check your connection and try again.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-5xl space-y-4 px-5 py-12 sm:px-8" aria-busy="true" aria-label="Loading">
          <div className="skeleton h-10 w-56" />
          {[0, 1, 2].map(i => <div key={i} className="skeleton h-20" />)}
        </main>
      </>
    );
  }

  if (!authenticated) return null;

  const openCount = userQueues.filter(q => q.status === 'open').length;

  return (
    <>
      <AppHeader>
        <button onClick={handleLogout} className="btn btn-sm text-ink-2 hover:text-ink">Log out</button>
      </AppHeader>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-12 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6 animate-rise">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em]">Your queues</h1>
            <p className="mt-2 text-mute">
              {userQueues.length === 0
                ? 'Nothing here yet.'
                : <><span className="font-mono tabular-nums text-ink">{userQueues.length}</span> total · <span className="font-mono tabular-nums text-ink">{openCount}</span> open now</>}
            </p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              New queue
            </button>
          )}
        </div>

        {error && <div className="mt-6"><Notice onDismiss={() => setError('')}>{error}</Notice></div>}

        {showForm && (
          <form onSubmit={handleCreateQueue} className="panel mt-8 p-6 sm:p-8 animate-rise">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">New queue</h2>
                <p className="mt-1 text-sm text-mute">Guests join with a code we generate for you.</p>
              </div>
              <button type="button" onClick={resetForm} className="btn btn-sm text-mute hover:text-ink">Cancel</button>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-[1fr_12rem]">
              <div>
                <label htmlFor="q-name" className="label">Name</label>
                <input id="q-name" type="text" required maxLength={255} value={newQueueName}
                  onChange={(e) => setNewQueueName(e.target.value)}
                  className="field" placeholder="e.g. Passport renewals" />
              </div>
              <div>
                <label htmlFor="q-serve" className="label">Avg. serve time</label>
                <div className="relative">
                  <input id="q-serve" type="number" required min="1" step="1" value={newAvgServeTime}
                    onChange={(e) => setNewAvgServeTime(Math.max(1, Math.floor(Number(e.target.value))).toString())}
                    className="field pr-14 font-mono tabular-nums" placeholder="5" />
                  <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-mute">min</span>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="q-desc" className="label">Description <span className="font-normal text-mute">(optional)</span></label>
              <textarea id="q-desc" value={newQueueDescription}
                onChange={(e) => setNewQueueDescription(e.target.value)}
                rows={3} className="field resize-none"
                placeholder="Shown to guests while they wait, e.g. “Bring your old passport and one photo.”" />
            </div>

            <label className="mt-6 flex w-fit cursor-pointer items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-ink" />
              Open and close automatically at set times
            </label>

            {isScheduled && (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 animate-rise">
                <div>
                  <label htmlFor="q-open" className="label">Opens at</label>
                  <input id="q-open" type="datetime-local" required value={scheduledOpenAt}
                    onChange={(e) => setScheduledOpenAt(e.target.value)} className="field" />
                </div>
                <div>
                  <label htmlFor="q-close" className="label">Closes at</label>
                  <input id="q-close" type="datetime-local" required value={scheduledCloseAt}
                    onChange={(e) => setScheduledCloseAt(e.target.value)} className="field" />
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-end border-t border-line pt-6">
              <button type="submit" disabled={creating} className="btn btn-primary">
                {creating ? <><Spinner /> Creating…</> : 'Create queue'}
              </button>
            </div>
          </form>
        )}

        <section className="mt-10" aria-label="Queues">
          {userQueues.length === 0 ? (
            !showForm && (
              <div className="panel grid gap-8 p-8 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10 animate-rise">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Start your first queue</h2>
                  <ol className="mt-4 space-y-2 text-ink-2">
                    <li><span className="mr-2 font-mono text-sm text-mute">01</span>Create a queue and set an average serve time.</li>
                    <li><span className="mr-2 font-mono text-sm text-mute">02</span>Share the 6-digit code or put it on a sign.</li>
                    <li><span className="mr-2 font-mono text-sm text-mute">03</span>Open it and call people in from your phone.</li>
                  </ol>
                </div>
                <button onClick={() => setShowForm(true)} className="btn btn-signal">Create a queue</button>
              </div>
            )
          ) : (
            <ul className="overflow-hidden rounded-[1.125rem] border border-line bg-card shadow-[var(--shadow-lift)]">
              {userQueues.map((queue, i) => (
                <li key={queue.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="group flex items-center justify-between gap-4 border-b border-line/70 px-5 py-4 transition-colors last:border-b-0 hover:bg-white sm:px-6 animate-rise">
                  <button onClick={() => navigate(`/queue/${queue.id}`)}
                    className="flex min-w-0 flex-1 items-center gap-4 rounded-md text-left">
                    <span className="hidden font-mono text-sm tabular-nums text-mute sm:inline">{String(i + 1).padStart(2, '0')}</span>
                    <span className="truncate text-lg font-medium tracking-tight">{queue.name}</span>
                    <StatusBadge status={queue.status} />
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <ConfirmButton onConfirm={() => handleDelete(queue.id)} confirmLabel="Delete?"
                      className="btn btn-danger btn-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100">
                      Delete
                    </ConfirmButton>
                    <button onClick={() => navigate(`/queue/${queue.id}`)} className="btn btn-quiet btn-sm">
                      Manage
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
};

export default Dashboard;
