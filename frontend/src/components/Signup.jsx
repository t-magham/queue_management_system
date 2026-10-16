import { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from './Input';
import AuthLayout from './AuthLayout.jsx';
import { Notice, Spinner } from './ui.jsx';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [uiErrorMessage, setUiErrorMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Enter a valid email address.';
    if (!formData.password) newErrors.password = 'Password is required.';
    else if (formData.password.length < 8) newErrors.password = 'Use at least 8 characters.';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords don’t match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsLoading(true);
    setUiErrorMessage('');

    try {
      const res = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        let errorMessage = 'Signup failed. Try again in a moment.';
        try {
          const errorData = await res.json();
          errorMessage = errorData?.detail || errorMessage;
        } catch {
          if (res.status === 409) errorMessage = 'An account with this email already exists.';
        }
        throw new Error(errorMessage);
      }

      setSuccess(true);
    } catch (error) {
      console.error('Signup failed:', error);
      setUiErrorMessage(error instanceof TypeError
        ? 'Couldn’t reach the server. Check your connection and try again.'
        : error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  if (success) {
    return (
      <AuthLayout title="Account created" subtitle={`You’re set up as ${formData.email}. Log in to create your first queue.`}>
        <Link to="/login" className="btn btn-primary w-full">Continue to log in</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up a queue for your counter, clinic or desk."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">Log in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input label="Email" type="email" autoComplete="email" placeholder="you@company.com"
          value={formData.email} onChange={handleChange('email')} error={errors.email} />
        <Input label="Password" type="password" autoComplete="new-password" placeholder="••••••••"
          hint="At least 8 characters."
          value={formData.password} onChange={handleChange('password')} error={errors.password} />
        <Input label="Confirm password" type="password" autoComplete="new-password" placeholder="••••••••"
          value={formData.confirmPassword} onChange={handleChange('confirmPassword')} error={errors.confirmPassword} />

        {uiErrorMessage && <Notice onDismiss={() => setUiErrorMessage('')}>{uiErrorMessage}</Notice>}

        <button type="submit" disabled={isLoading} className="btn btn-primary w-full !mt-8">
          {isLoading ? <><Spinner /> Creating account…</> : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
