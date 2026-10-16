import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader, BackLink, Notice, Spinner } from './ui.jsx';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

const JoinPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) { setError('Enter a name so staff can call you.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${baseUrl}/queues/join/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        // store guest JWT — this is the secure ticket
        localStorage.setItem('guest_token', data.guest_token);
        localStorage.setItem('guest_entry_id', data.entry_id);
        navigate(`/guest/${data.queue_id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Couldn’t join this queue.');
      }
    } catch (e) {
      console.error('Join failed', e);
      setError('Couldn’t reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-md px-5 pb-24 pt-12 sm:pt-20">
        <BackLink to="/join">Change code</BackLink>
        <div className="mt-8 animate-rise">
          <p className="eyebrow">Step 2 of 2 · code <span className="text-ink">{code}</span></p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">What should we call you?</h1>
          <p className="mt-3 text-mute">Staff and others in line will see this name on the board.</p>

          <form onSubmit={handleJoin} className="mt-10 space-y-5" noValidate>
            <div>
              <label htmlFor="display-name" className="label">Your name</label>
              <input
                id="display-name"
                autoFocus
                autoComplete="given-name"
                maxLength={50}
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError(''); }}
                placeholder="e.g. Priya S."
                className="field"
              />
            </div>
            {error && <Notice>{error}</Notice>}
            <button type="submit" disabled={loading} className="btn btn-signal w-full">
              {loading ? <><Spinner /> Joining…</> : 'Get my ticket'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
};

export default JoinPage;
