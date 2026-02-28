import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import logo from '../assets/Logo.png';
import Button from '../components/ui/Button';

const Login: React.FC = () => {

  const { login } = useAppContext();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Load remembered username
  useEffect(() => {
    const savedUser = localStorage.getItem('osdsarvaya_remember');
    if (savedUser) {
      setUsername(savedUser);
    }
  }, []);

  const handleLogin = async () => {

    setError(null);

    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error('Invalid credentials');
      }

      // ✅ Save token via context
      login(data.token);

      // ✅ Remember username
      if (remember) {
        localStorage.setItem('osdsarvaya_remember', username);
      } else {
        localStorage.removeItem('osdsarvaya_remember');
      }

      // ✅ REDIRECT (PRIMARY FIX)
      navigate('/dashboard');

      // ✅ Optional fallback (uncomment if context delay issue)
      // window.location.href = '/dashboard';

    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 px-4 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">

      {/* ===== LOGIN CARD ===== */}
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6">

        {/* ===== BRANDING ===== */}
        <div className="text-center">

          <img
            src={logo}
            alt="OSDuo Tech"
            className="h-12 mx-auto mb-3 bg-white p-1 rounded"
          />

          <h1 className="text-2xl font-semibold tracking-wide text-gray-800 dark:text-white">
            OSDSarvaya
          </h1>

          <a
            href="mailto:info@osduotech.com"
            className="text-xs text-gray-500 hover:text-blue-600"
          >
            by OSDuo Tech
          </a>
        </div>

        {/* ===== FORM ===== */}
        <div className="space-y-4">

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* USERNAME */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Username
            </label>
            <input
              type="text"
              className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter username"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-12 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter password"
              />

              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* REMEMBER */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
                className="rounded border-gray-300 dark:border-slate-600"
              />
              <span className="text-gray-600 dark:text-gray-400">Remember me</span>
            </label>
          </div>

          {/* LOGIN BUTTON */}
          <Button
            className="w-full"
            onClick={handleLogin}
            loading={loading}
          >
            Login
          </Button>

        </div>

        {/* ===== FOOTER ===== */}
        <div className="text-center text-xs text-gray-500 pt-4 border-t">

          <div>
            Need help?{' '}
            <a
              href="mailto:info@osduotech.com"
              className="text-blue-600 hover:underline"
            >
              contact: info@osduotech.com
            </a>
          </div>

          <div className="mt-1">
            © {new Date().getFullYear()} OSDuo Tech
          </div>

        </div>

      </div>
    </div>
  );
};

export default Login;
