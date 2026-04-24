import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const baseUrl = import.meta.env.VITE_API_BASE_URL;
const wsBase = baseUrl.replace(/^http/, 'ws');

const AdminQueuePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [queueState, setQueueState] = useState(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { navigate('/login'); return; }

    // initial state load
    fetch(`${baseUrl}/queues/state/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setQueueState(data); setLoading(false); })
      .catch(e => console.error('Failed to load queue state', e));

    // WS — admin passes auth_token
    const ws = new WebSocket(`${wsBase}/ws/queue/${id}?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = (event) => setQueueState(JSON.parse(event.data));
    ws.onerror = (e) => console.error('WS error', e);

    return () => ws.close();
  }, [id, navigate]);

  const adminAction = async (action) => {
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch(`${baseUrl}/queues/${action}/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Action failed');
      }
    } catch (e) {
      console.error(`Action ${action} failed`, e);
    }
  };
  const handleDeleteEntry = async (entryId) => {
    try {
      const res = await fetch(`${baseUrl}/queues/delete-entry/${entryId}`, { method: 'DELETE' });
      // refresh queue state however you currently do it
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Action failed');
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-lg font-semibold text-gray-600">Loading queue...</div>
    </div>
  );

  const { queue, entries, stats } = queueState;

  return (
    //at adminqueuepage.jsx we have:
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{queue.name}</h1>
            <p className="text-sm text-gray-500 mt-1">Code: <strong className="tracking-widest">{queue.code}</strong></p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize
            ${queue.status === 'open' ? 'bg-green-100 text-green-800' :
              queue.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'}`}>
            {queue.status}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Waiting', value: stats.waiting_count },
            { label: 'Served today', value: stats.served_count },
            { label: 'Est. wait', value: `${stats.estimated_wait * stats.waiting_count} min` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-gray-800">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Admin Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Controls</h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => adminAction('open')}
              disabled={queue.status === 'open'}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-medium py-2 px-4 rounded transition-colors">
              Open
            </button>
            <button onClick={() => adminAction('close')}
              disabled={queue.status === 'closed'}
              className="bg-gray-600 hover:bg-gray-700 disabled:opacity-40 text-white font-medium py-2 px-4 rounded transition-colors">
              Close
            </button>
            <button onClick={() => adminAction('call-next')}
              disabled={queue.status !== 'open'}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium py-2 px-4 rounded transition-colors">
              Call Next
            </button>
            <button onClick={() => adminAction('skip')}
              disabled={!entries.some(e => e.status === 'called')}
              className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white font-medium py-2 px-4 rounded transition-colors">
              Skip Current
            </button>
          </div>
        </div>

        {/* Entries */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Live Queue</h2>
          {entries.length === 0 ? (
            <p className="text-gray-500 text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
              No one in the queue yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry, index) => {
                // how many 'waiting' entries are ahead of this one
                const ahead = entries.filter(
                  e => e.status === 'waiting' && e.join_number < entry.join_number
                ).length;
                const estCallAfter = ahead * queue.avg_serve_time ; // minutes

                return (
                  <li key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-lg border
                      ${entry.status === 'called'      ? 'bg-blue-50 border-blue-300'    :
                        'bg-white border-gray-200'}`}>

                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm w-6">#{index + 1}</span>
                      <div>
                        <span className="font-medium text-gray-800">
                          {/* guest page: append "(you)", admin page: just entry.display_name */}
                          {entry.display_name}
                        </span>
                        {entry.status === 'waiting' && (
                          <p className="text-xs text-gray-400">Est. call after: {estCallAfter} min</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status badge — shown for all statuses */}
                      <span className={`text-xs font-medium px-2 py-1 rounded-full
                        ${entry.status === 'called'  ? 'bg-blue-100 text-blue-800'   :
                          entry.status === 'waiting' ? 'bg-gray-100 text-gray-600'   :
                          entry.status === 'served'  ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'}`}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </span>

                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                          title="Remove from queue">
                          ✕
                        </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminQueuePage;