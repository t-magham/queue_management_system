import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppHeader, StatusBadge } from './ui.jsx';

const demoEntries = [
  { n: 41, name: 'Amara Okafor', status: 'served' },
  { n: 42, name: 'Lukas Brandt', status: 'called' },
  { n: 43, name: 'Yusuf Haddad', status: 'waiting', eta: 4 },
  { n: 44, name: 'Mei Tanaka', status: 'waiting', eta: 8 },
  { n: 45, name: 'Sofía Ruiz', status: 'waiting', eta: 13 },
];

export default function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    const clean = code.replace(/\s/g, '');
    if (!clean) { setError('Enter the code you were given.'); return; }
    navigate(`/join/${clean.toUpperCase()}`);
  };

  return (
    <>
      <AppHeader>
        <Link to="/login" className="btn btn-sm text-ink-2 hover:text-ink">Log in</Link>
        <Link to="/signup" className="btn btn-quiet btn-sm hidden sm:inline-flex">Run a queue</Link>
      </AppHeader>

      <main className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-16">
        <section className="animate-rise">
          <p className="eyebrow mb-6">Virtual queueing</p>
          <h1 className="text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[4.25rem]">
            Take a number.<br />
            <span className="text-mute">Wait anywhere.</span>
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-2">
            Join a line from your phone and watch your place move in real time. No standing around, no paper tickets.
          </p>

          <form onSubmit={handleJoin} className="mt-10 max-w-md" noValidate>
            <label htmlFor="home-code" className="label">Have a queue code?</label>
            <div className="flex gap-2">
              <input
                id="home-code"
                inputMode="numeric"
                autoComplete="off"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(''); }}
                placeholder="482 913"
                aria-invalid={error ? 'true' : undefined}
                className="field flex-1 font-mono text-lg tracking-[0.2em]"
              />
              <button type="submit" className="btn btn-signal px-5">
                Join
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
            {error && <p className="mt-1.5 text-[0.8125rem] text-stop">{error}</p>}
          </form>

          <p className="mt-8 text-sm text-mute">
            Running a counter, clinic or help desk?{' '}
            <Link to="/signup" className="font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
              Create a queue
            </Link>{' '}
            in under a minute.
          </p>
        </section>

        <section aria-label="Example of a live queue" className="relative animate-rise [animation-delay:120ms]">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(60%_60%_at_70%_30%,rgb(194_65_12/0.10),transparent_70%)]" />
          <div className="ticket overflow-hidden">
            <div className="flex items-start justify-between px-6 pb-6 pt-6 sm:px-8">
              <div>
                <p className="eyebrow">Now serving</p>
                <p className="mt-2 font-mono text-[4.5rem] font-medium leading-none tracking-tight tabular-nums">
                  <span className="text-mute/60">Nº</span>042
                </p>
              </div>
              <div className="text-right">
                <StatusBadge status="open" />
                <p className="mt-3 text-sm font-medium">City Library — Help Desk</p>
                <p className="font-mono text-xs text-mute">code 482913</p>
              </div>
            </div>
            <div className="ticket-perf mx-0" />
            <ul className="divide-y divide-line/70 px-6 py-2 sm:px-8">
              {demoEntries.map(e => (
                <li key={e.n} className={`flex items-center justify-between py-3 ${e.status === 'served' ? 'opacity-45' : ''}`}>
                  <div className="flex items-center gap-4">
                    <span className="w-8 font-mono text-sm tabular-nums text-mute">{e.n}</span>
                    <span className="font-medium">{e.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {e.eta && <span className="hidden font-mono text-xs tabular-nums text-mute sm:inline">~{e.eta} min</span>}
                    <StatusBadge status={e.status} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
