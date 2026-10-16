import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader, BackLink } from './ui.jsx';

const JoinLanding = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = code.replace(/\s/g, '');
    if (!clean) { setError('Enter the code you were given.'); return; }
    navigate(`/join/${clean.toUpperCase()}`);
  };

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-md px-5 pb-24 pt-12 sm:pt-20">
        <BackLink to="/">Home</BackLink>
        <div className="mt-8 animate-rise">
          <p className="eyebrow">Step 1 of 2</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">Enter your queue code</h1>
          <p className="mt-3 text-mute">It’s the 6-digit number shown at the counter or sent to you by the organiser.</p>

          <form onSubmit={handleSubmit} className="mt-10" noValidate>
            <label htmlFor="join-code" className="sr-only">Queue code</label>
            <input
              id="join-code"
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              maxLength={16}
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              placeholder="000000"
              aria-invalid={error ? 'true' : undefined}
              className="field !min-h-16 text-center font-mono text-3xl tracking-[0.35em]"
            />
            {error && <p className="mt-2 text-[0.8125rem] text-stop">{error}</p>}
            <button type="submit" className="btn btn-signal mt-5 w-full">Continue</button>
          </form>
        </div>
      </main>
    </>
  );
};

export default JoinLanding;
