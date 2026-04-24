import React, { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import Input from './Input';

const baseUrl = import.meta.env.VITE_API_BASE_URL;
const siteName = import.meta.env.VITE_APP_NAME;

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [uiErrorMessage, setUiErrorMessage] = useState("");

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { type, value } = e.target;
    const name = type;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (formData.password.length < 8) {
      newErrors.password = 'Password too short';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    console.log(formData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    // validate the credentials from the backend, post request
    try {
      const res = await fetch(`${baseUrl}/auth/login`,{ 
        method: "POST", 
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(formData),
      })
      if(res.ok){
        console.log(res);
        try {
          const data = await res.json();
          if(data.token) {
            localStorage.setItem("auth_token", data.token);
            navigate("/dashboard")
          } else {
            console.log("no token")
          }
        } catch (parseError) {
          throw new Error("failed parsing response");  
        }
      } else {
        throw new Error("false credentials");  
      }

    } catch (error) {
      // --- THE OUTER CATCH ---
      console.error("Submission error:", error);
      setUiErrorMessage(error.message); 
    } finally {
      setIsLoading(false); // Stop the loading spinner whether it succeeded or failed
    }

  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 font-sans text-neutral-900">
      
      {/* Back to Home Link */}
      <div className="w-full max-w-md mb-6">
        <Link to="/" 
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors flex items-center space-x-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          {/* <Link to="/">Back to home</Link> */}
          Back to home
        </Link>
      </div>

      {/* Card Container */}
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-neutral-100">
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">Log in to {siteName}</h2>
          <p className="text-sm text-neutral-500 mt-2">Enter your details to manage your queues.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          
          {/* Email Field */}
          <Input 
            label="Email" 
            type="email" 
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleInputChange}
            error={errors.email}
          />        
          {/* Password Field */}
          <Input 
            label="Password" 
            type="password" 
            placeholder="••••••••"
            value={formData.password}
            onChange={handleInputChange}
            error={errors.password}
          />
          {/* 2. Conditionally render the Tailwind error box ONLY if state has text */}
          {uiErrorMessage && (
            <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm border border-red-200">
              {uiErrorMessage}
            </div>
          )}
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-900 text-white px-4 py-3 rounded-lg font-medium shadow-sm hover:bg-neutral-800 transition-all focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center mt-6"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Log in'
            )}
          </button>
        </form>

        {/* Secondary Action */}
        <div className="mt-8 text-center text-sm">
          <span className="text-neutral-500">Don't have an account? </span>
          <button 
            className="text-neutral-900 font-medium hover:underline focus:outline-none"
            onClick={() => console.log('Navigate to Sign Up')}
          >
            <Link to="/signup">Create account</Link>
          </button>
        </div>

      </div>
    </div>
  );
}