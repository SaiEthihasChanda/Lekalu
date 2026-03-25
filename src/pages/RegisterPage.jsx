import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Mail, Lock, AlertCircle } from 'lucide-react';
import { registerUser } from '../fb/index.js';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password || !confirmPassword) {
        setError('Please fill in all fields');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      await registerUser(email, password);
      // Navigate to login after successful registration
      navigate('/login', { state: { message: 'Registration successful! Please login.' } });
    } catch (err) {
      const errorMessage = err.code === 'auth/email-already-in-use'
        ? 'Email already registered. Please login instead.'
        : err.code === 'auth/invalid-email'
        ? 'Invalid email address.'
        : err.code === 'auth/weak-password'
        ? 'Password is too weak. Use at least 6 characters.'
        : err.message || 'Registration failed. Please try again.';
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
            <h1 className="text-3xl font-bold text-white">Lekalu</h1>
          </div>
          <p className="text-gray-400">Personal Expense Tracker</p>
        </div>

        {/* Register Card */}
        <div className="bg-secondary rounded-lg border border-gray-700 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleRegister} className="space-y-4">
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
                  placeholder="At least 6 characters"
                  className="w-full bg-primary border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full bg-primary border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-colors mt-6"
            >
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-accent hover:text-blue-600 font-medium transition-colors"
            >
              Login here
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
