import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const JoinLanding = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!code.trim()) { setError('Please enter a queue code'); return; }
    navigate(`/join/${code.trim().toUpperCase()}`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white rounded-lg shadow p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Join a Queue</h1>
        <p className="text-sm text-gray-500 mb-6">Enter the queue code provided to you.</p>

        <label className="block text-sm font-medium text-gray-700 mb-1">Queue code</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g. 123456"
          className="w-full border border-gray-300 rounded-md p-2 mb-4 uppercase tracking-widest"
        />

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button onClick={handleSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors">
          Continue
        </button>
      </div>
    </div>
  );
};

export default JoinLanding;