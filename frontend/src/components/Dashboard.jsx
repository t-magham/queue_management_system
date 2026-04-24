import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Adjusted state: arrays for lists, added user state back for the welcome banner
  const [userQueues, setUserQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Form state for creating a new queue
const [showForm, setShowForm] = useState(false);
const [newQueueName, setNewQueueName]             = useState('');
const [newQueueDescription, setNewQueueDescription] = useState('');
const [newAvgServeTime, setNewAvgServeTime]       = useState('');   // minutes (user-facing)
const [isScheduled, setIsScheduled]               = useState(false);
const [scheduledOpenAt, setScheduledOpenAt]       = useState('');
const [scheduledCloseAt, setScheduledCloseAt]     = useState('');

  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        console.log("not authenticated");
        navigate('/login');
        return;
      }

      try {
        // get user queues: if any
        const response = await fetch(`${baseUrl}/queues/dashboard`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          try {
            // if(data == null) console.log("data is null  ")
            const data = await response.json();
            console.log("console in validateSession")
            // Assuming API returns { queues: [...] }
            console.log(data)
            setUserQueues(data?.queues || []);
            setAuthenticated(true);
            // console.log(data.id)
          } catch (jsonError) {
            console.error("Failed to parse server response:", jsonError);
            // If response is OK but not JSON, something is wrong with the API or auth
            // localStorage.removeItem('auth_token'); why would you want to remove it?
            // navigate('/login');
          }
        } else {
          console.error("Session invalid");
          localStorage.removeItem('auth_token'); // remove possible fraud token
          navigate('/login');
        }
      } catch (error) {
        console.error("Network error validating session:", error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, [navigate]);

  // Handler: Navigate to queue details page
  const handleDetails = (queueId) => {
    navigate(`/queue/${queueId}`);
  };
  // handler: delete queue
  const handleDelete = async (queueId) => {
    if (!confirm("Delete this queue?")) return;
    
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${baseUrl}/queues/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ queue_id: queueId }),
    });

    if (response.ok) {
      setUserQueues(prev => prev.filter(q => q.id !== queueId));
    } else {
      console.error("Failed to delete queue");
    }
  };
  // Handler: Submit new queue form

const handleCreateQueue = async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('auth_token');

  const payload = {
    queue_name: newQueueName,
    description: newQueueDescription || null,
    avg_serve_time: parseInt(newAvgServeTime),          // convert min → seconds
    scheduled_open_at:  isScheduled ? scheduledOpenAt  : null,
    scheduled_close_at: isScheduled ? scheduledCloseAt : null,
  };

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
      console.log(data);
      setUserQueues([...userQueues, data]);  
    } else {
      console.error('Failed to create queue', await res.text());
    }
  } catch (err) {
    console.error('Network error:', err);
  }

  // Reset form
  setNewQueueName('');
  setNewQueueDescription('');
  setNewAvgServeTime('');
  setIsScheduled(false);
  setScheduledOpenAt('');
  setScheduledCloseAt('');
  setShowForm(false);
};


if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-lg font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  return authenticated ? (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            {showForm ? 'Cancel' : '+ Create New Queue'}
          </button>
        </div>
        
        {/* Welcome Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm font-medium text-blue-700">
            Welcome back!
          </p>
        </div>

{/* Create Queue Form */}
{showForm && (
  <form onSubmit={handleCreateQueue} className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-6">
    <h2 className="text-lg font-semibold text-gray-700 mb-4">Create a new queue</h2>

    <div className="flex flex-col md:flex-row gap-4 mb-4">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">Queue name *</label>
        <input type="text" required value={newQueueName}
          onChange={(e) => setNewQueueName(e.target.value)}
          className="w-full border border-gray-300 rounded-md p-2"
          placeholder="e.g. Support tickets" />
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">Avg. serve time (minutes) *</label>
        {/* 2. avg_serve_time — positive integers only*/}
        <input
          type="number" required min="1" step="1" value={newAvgServeTime} 
          onChange={(e) => setNewAvgServeTime(Math.max(1, Math.floor(Number(e.target.value))).toString())}
          className="w-full border border-gray-300 rounded-md p-2"
          placeholder="e.g. 5"
        />
      </div>
    </div>

    {/*1. textarea for description*/}
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
      <textarea
        value={newQueueDescription}
        onChange={(e) => setNewQueueDescription(e.target.value)}
        rows={4}
        className="w-full border border-gray-300 rounded-md p-2 resize-none"
        placeholder="Optional — describe what this queue is for"
      />
    </div>

    <div className="flex items-center gap-2 mb-4">
      <input type="checkbox" id="isScheduled" checked={isScheduled}
        onChange={(e) => setIsScheduled(e.target.checked)}
        className="w-4 h-4 cursor-pointer" />
      <label htmlFor="isScheduled" className="text-sm font-medium text-gray-700 cursor-pointer">
        Schedule open / close times
      </label>
    </div>

    {isScheduled && (
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Open at</label>
          <input type="datetime-local" required value={scheduledOpenAt}
            onChange={(e) => setScheduledOpenAt(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Close at</label>
          <input type="datetime-local" required value={scheduledCloseAt}
            onChange={(e) => setScheduledCloseAt(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2" />
        </div>
      </div>
    )}

    <button type="submit"
      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors">
      Save queue
    </button>
  </form>
)}

        {/* Queues List Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Your Queues</h2>
          
          {userQueues.length === 0 ? (
            <p className="text-gray-500 text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
              You haven't created any queues yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {userQueues.map((queue) => (
                <li 
                  key={queue.id} 
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div>
                    <h3 className="text-md font-semibold text-gray-800">{queue.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 capitalize
                      ${queue.status === 'opened' ? 'bg-green-100 text-green-800' : 
                        queue.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'}`}
                    >
                      {queue.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDetails(queue.id)}
                      className="text-blue-600 hover:text-blue-800 border border-blue-600 hover:bg-blue-50 font-medium py-1.5 px-4 rounded transition-colors text-sm"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => handleDelete(queue.id)}
                      className="text-red-600 hover:text-red-800 border border-red-600 hover:bg-red-50 font-medium py-1.5 px-4 rounded transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  ) : null;
};

export default Dashboard;