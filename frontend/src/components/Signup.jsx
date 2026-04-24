import { useState } from 'react';
import Input from './Input';
import { Link } from 'react-router-dom';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

export default function Signup() {
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [uiErrorMessage, setUiErrorMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    // input fields simple validation 
    const newErrors = {};
    // email and password checks
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password.length > 0 && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsLoading(true);

    // API POST request to create new record in the db with these credentials.
    // --- THE OUTER TRY...CATCH ---
    // This wraps everything. It catches network crashes AND your custom errors.
    try {
      console.log("password type:", typeof formData.password);
      console.log("password length:", formData.password?.length);
      // 1. The Fetch Call
      const res = await fetch(`${baseUrl}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      // 2. HTTP Error Handling
      if (!res.ok) {
        let errorMessage = "Signup failed. Please try again later.";

        // --- THE INNER TRY...CATCH ---
        try {
          const errorData = await res.json();
          errorMessage = errorData?.detail || errorMessage; 
        } catch (parseError) {
          if (res.status === 409) errorMessage = "Email already exists.";
        }

        // This instantly jumps us out of the try block and down to the OUTER catch!
        throw new Error(errorMessage); 
      }
      
      // 3. Success (Only runs if res.ok was true)
      setSuccess(true);

    } catch (error) {
      // --- THE OUTER CATCH ---
      
      console.error("Submission error:", error);
      
      setUiErrorMessage(error.message); 
      
    } finally {
      setIsLoading(false); // Stop the loading spinner whether it succeeded or failed
    }
  };

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    // Clear error for the specific field as the user types
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };
  if (success) {
    return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4 font-sans text-neutral-900">
      <div className="w-full max-w-sm bg-white border border-neutral-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 text-center">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          {/* Simple checkmark SVG */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">Account created</h2>
        <p className="text-sm text-neutral-500 mb-8">Signup successful. You can log in now.</p>
        
        <div className="flex flex-col space-y-3">
          <Link 
            to="/login"// Replace with navigate('/login') if using React Router
            className="w-full bg-neutral-900 text-white py-2.5 rounded-md text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4 font-sans text-neutral-900">
      
      {/* Centered Card matching Login.jsx exactly */}
      <div className="w-full max-w-sm bg-white border border-neutral-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Create an account</h2>
          <p className="text-sm text-neutral-500 mt-2">Get started with your first queue.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Email" 
            type="email" 
            placeholder="name@example.com"
            value={formData.email}
            onChange={handleChange('email')}
            error={errors.email}
          />
          
          <Input 
            label="Password" 
            type="password" 
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange('password')}
            error={errors.password}
          />

          <Input 
            label="Confirm Password" 
            type="password" 
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={errors.confirmPassword}
          />
          {/* 2. Conditionally render the Tailwind error box ONLY if state has text */}
          {uiErrorMessage && (
            <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm border border-red-200">
              {uiErrorMessage}
            </div>
          )}
          {/* Primary Button */}
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-neutral-900 text-white py-2.5 rounded-md text-sm font-medium mt-6 
                       hover:bg-neutral-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed
                       flex items-center justify-center"
          >
            {isLoading ? (
              <>
                {/* Pure SVG Spinner instead of Lucide */}
                <svg 
                  className="mr-2 h-4 w-4 animate-spin text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center text-sm space-y-2">
          <p className="text-neutral-500">
            Already have an account?{' '}
            <Link to="/login" className="text-neutral-900 font-medium hover:underline">Log in</Link>
          </p>
        </div>

      </div>
    </div>
  );
}