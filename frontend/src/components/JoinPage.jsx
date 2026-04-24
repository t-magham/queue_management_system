import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

const JoinPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!displayName.trim()) { setError('Please enter your name'); return; }
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
        const err = await res.json();
        setError(err.detail || 'Failed to join queue');
      }
    } catch (e) {
      console.error('Join failed', e);
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white rounded-lg shadow p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Almost there!</h1>
        <p className="text-sm text-gray-500 mb-6">Queue code: <strong>{code}</strong></p>

        <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          placeholder="e.g. John"
          className="w-full border border-gray-300 rounded-md p-2 mb-4"
        />

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button onClick={handleJoin} disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded transition-colors">
          {loading ? 'Joining...' : 'Join Queue'}
        </button>
      </div>
    </div>
  );
};

export default JoinPage;