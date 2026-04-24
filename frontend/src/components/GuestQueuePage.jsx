import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const baseUrl = import.meta.env.VITE_API_BASE_URL;
const wsBase = baseUrl.replace(/^http/, 'ws');

const GuestQueuePage = () => {
  const { queue_id } = useParams();
  const navigate = useNavigate();
  const [queueState, setQueueState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenExpired, setTokenExpired] = useState(false);
  const wsRef = useRef(null);
  const isLeavingVoluntarily = useRef(false); // new flag


  const guestToken = localStorage.getItem('guest_token');
  const myEntryId = parseInt(localStorage.getItem('guest_entry_id'));

  useEffect(() => {
    if (!guestToken) { navigate('/join'); return; }

    fetch(`${baseUrl}/queues/state/${queue_id}`)
      .then(r => r.json())
      .then(data => { setQueueState(data); setLoading(false); })
      .catch(e => console.error('Failed to load state', e));

    const ws = new WebSocket(`${wsBase}/ws/queue/${queue_id}?token=${guestToken}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const {entries} = data;
      const myEntry = entries.find(e => e.id === myEntryId);
      if(!myEntry && !isLeavingVoluntarily) {
        alert('You have been removed from the queue by the admin.');
        navigate('/');
      }
      setQueueState(JSON.parse(event.data));
    }
    ws.onclose = (event) => {
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
  }, [queue_id, navigate]);

  const handleLeave = async () => {
    if (!confirm('Leave the queue?')) return;
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

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-lg font-semibold text-gray-600">Loading...</div>
    </div>
  );

  if (tokenExpired) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="bg-white rounded-lg shadow p-8 text-center max-w-sm">
        <p className="text-gray-800 font-semibold mb-2">Your session expired</p>
        <p className="text-gray-500 text-sm mb-4">Your spot was removed from the queue.</p>
        <button onClick={() => navigate('/join')}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
          Rejoin Queue
        </button>
      </div>
    </div>
  );
  const { queue, entries, stats } = queueState;
  const myEntry = entries.find(e => e.id === myEntryId);


  const waitingAhead = entries.filter(
    e => e.status === 'waiting' && e.join_number < (myEntry?.join_number ?? Infinity)
  ).length;
  const estimatedWait = waitingAhead * queue.avg_serve_time;
  const isCalled = myEntry?.status === 'called';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Called banner */}
        {isCalled && (
          <div className="bg-blue-600 text-white rounded-lg p-5 text-center animate-pulse">
            <p className="text-xl font-bold">🔔 You're being called!</p>
            <p className="text-sm mt-1">Please proceed to the counter.</p>
          </div>
        )}

        {/* Queue info */}
        <div className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{queue.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {myEntry ? `Your ticket #${myEntry.join_number}` : 'You are no longer in the queue'}
            </p>
            {queue.description && (
              <p className="text-sm text-gray-600 mt-2 border-t pt-2">{queue.description}</p>
            )}
          </div>
          <button onClick={handleLeave}
            className="text-red-600 hover:text-red-800 border border-red-300 hover:bg-red-50 text-sm font-medium py-1.5 px-3 rounded transition-colors">
            Leave
          </button>
        </div>

        {/* My stats */}
        {myEntry && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-3xl font-bold text-gray-800">{waitingAhead}</div>
              <div className="text-sm text-gray-500">ahead of you</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-3xl font-bold text-gray-800">{estimatedWait} min</div>
              <div className="text-sm text-gray-500">est. wait</div>
            </div>
          </div>
        )}
        {/* Live queue — everyone sees this */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Live Queue <span className="text-sm font-normal text-gray-400">({stats.waiting_count} waiting)</span>
          </h2>
          {entries.length === 0 ? (
            <p className="text-gray-500 text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
              Queue is empty.
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry, index) => {
                // how many 'waiting' entries are ahead of this one
                const ahead = entries.filter(
                  e => e.status === 'waiting' && e.join_number < entry.join_number
                ).length;
                const estCallAfter = Math.round((ahead * queue.avg_serve_time) / 60); // seconds → minutes

                return (
                  <li key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-lg border
                      ${entry.id === myEntryId         ? 'bg-yellow-50 border-yellow-300' :   // guest page only
                        entry.status === 'called'      ? 'bg-blue-50 border-blue-300'    :
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

export default GuestQueuePage;