import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from './Input';
import AuthLayout from './AuthLayout.jsx';
import { Notice, Spinner } from './ui.jsx';
import { siteName } from '../lib/format.js';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [uiErrorMessage, setUiErrorMessage] = useState('');

  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (formData.password.length < 8) {
      newErrors.password = 'Passwords are at least 8 characters.';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setUiErrorMessage('');
    try {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('That email and password don’t match an account.');

      const data = await res.json().catch(() => null);
      if (!data?.token) throw new Error('The server sent an unexpected response. Try again.');
      localStorage.setItem('auth_token', data.token);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      setUiErrorMessage(error instanceof TypeError
        ? 'Couldn’t reach the server. Check your connection and try again.'
        : error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={`Log in to manage your queues on ${siteName}.`}
      footer={<>No account yet? <Link to="/signup" className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">Create one</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input label="Email" type="email" autoComplete="email" placeholder="you@company.com"
          value={formData.email} onChange={handleChange('email')} error={errors.email} />
        <Input label="Password" type="password" autoComplete="current-password" placeholder="••••••••"
          value={formData.password} onChange={handleChange('password')} error={errors.password} />

        {uiErrorMessage && <Notice onDismiss={() => setUiErrorMessage('')}>{uiErrorMessage}</Notice>}

        <button type="submit" disabled={isLoading} className="btn btn-primary w-full !mt-8">
          {isLoading ? <><Spinner /> Logging in…</> : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}
