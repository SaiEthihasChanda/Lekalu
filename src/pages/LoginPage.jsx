import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Mail, Lock, AlertCircle, LogIn } from 'lucide-react';
import { loginUser, signInWithGoogle } from '../fb/index.js';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Please fill in all fields');
        return;
      }

      await loginUser(email, password);
      navigate('/');
    } catch (err) {
      const errorMessage = err.code === 'auth/user-not-found'
        ? 'User not found. Please register first.'
        : err.code === 'auth/wrong-password'
        ? 'Incorrect password.'
        : err.code === 'auth/invalid-email'
        ? 'Invalid email address.'
        : err.message || 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      const errorMessage = err.code === 'auth/popup-closed-by-user'
        ? 'Sign-in cancelled.'
        : err.code === 'auth/popup-blocked'
        ? 'Sign-in popup was blocked. Please allow popups.'
        : err.message || 'Google sign-in failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp size={32} className="text-accent" />
            <h1 className="text-3xl font-bold text-white">Lekkalu</h1>
          </div>
          <p className="text-gray-400">Personal Expense Tracker</p>
        </div>

        {/* Login Card */}
        <div className="bg-secondary rounded-lg border border-gray-700 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Login</h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-primary border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-primary border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-colors mt-6"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 border-t border-gray-600"></div>
            <span className="text-gray-400 text-sm">or</span>
            <div className="flex-1 border-t border-gray-600"></div>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            Sign in with Google
          </button>

          {/* Register Link */}
          <p className="text-center text-gray-400 text-sm mt-6">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-accent hover:text-blue-600 font-medium transition-colors"
            >
              Register here
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-8">
          Your expense data is safely stored in the cloud
        </p>
      </div>
    </div>
  );
};
