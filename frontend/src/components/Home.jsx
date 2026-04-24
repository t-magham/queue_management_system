import React from 'react';
import { useNavigate } from 'react-router-dom';

const baseUrl = import.meta.env.VITE_API_BASE_URL;
const siteName = import.meta.env.VITE_APP_NAME;
export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 font-sans text-neutral-900">
      
      {/* Main Container */}
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-12">
        
        {/* Logo / App Name */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center mb-2">
            {/* Simple geometric logo placeholder */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{siteName}</h1>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col space-y-4">
          <button 
            className="w-full bg-neutral-900 text-white px-6 py-4 rounded-lg text-lg font-medium shadow-sm hover:bg-neutral-800 transition-all focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
            onClick={() => navigate("/login")}
          >
            Create new queue
          </button>
          
          <button 
            className="w-full bg-white text-neutral-900 px-6 py-4 rounded-lg text-lg font-medium border border-neutral-200 shadow-sm hover:bg-neutral-50 transition-all focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:ring-offset-2"
            onClick={() => navigate('/join')}
          >
            Enter a queue
          </button>
        </div>

      </div>
      
    </div>
  );
}