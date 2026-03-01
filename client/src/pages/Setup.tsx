import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import logo from '../assets/Logo.png';
import { getVersion } from '../version';

const Setup: React.FC = () => {
  const { login } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd: string): boolean => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters with 1 uppercase letter and 1 numeric digit');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        login(data.token);
        localStorage.setItem('username', data.username);
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'Setup failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={logo}
            alt="OSDSarvaya"
            className="h-16 w-auto mx-auto mb-4 bg-white p-2 rounded-lg"
          />
          <h1 className="text-2xl font-bold text-white">OSDSarvaya</h1>
          <p className="text-gray-400 mt-2">Setup Admin Account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter username"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Confirm password"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Setting up...' : 'Create Admin Account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Password requirements:</p>
          <ul className="mt-2 space-y-1">
            <li className={password.length >= 8 ? 'text-green-500' : 'text-gray-500'}>
              ✓ At least 8 characters
            </li>
            <li className={/[A-Z]/.test(password) ? 'text-green-500' : 'text-gray-500'}>
              ✓ At least 1 uppercase letter
            </li>
            <li className={/\d/.test(password) ? 'text-green-500' : 'text-gray-500'}>
              ✓ At least 1 numeric digit
            </li>
          </ul>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700 text-center">
          <p className="text-gray-400 text-sm">
            Version {getVersion()}
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Setup;
