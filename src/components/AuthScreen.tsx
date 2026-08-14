import React, { useState } from 'react';
import { api } from '../lib/api';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.login(username, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-portal-screen" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-slate-900 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Official Brand Logo */}
        <div className="flex justify-center mb-5">
          <div className="w-24 h-24 sm:w-28 sm:h-28 p-2 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center">
            <img
              src="/assets/branding/milestone-logo.svg"
              alt="Milestone Consultancy Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
          Milestone Consultancy
        </h1>
        <p className="mt-1 text-xs text-slate-500 font-semibold tracking-wider uppercase">
          Workforce Attendance & Command Center
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Sign In to Your Account</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter your company credentials to continue</p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Username or Official Email
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="auth-username-input"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition outline-hidden font-medium"
                  placeholder="Enter your assigned username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Account Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition outline-hidden font-medium"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                id="auth-submit-button"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Verifying Credentials...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Assurance Footer */}
        <div className="mt-5 text-center">
          <p className="text-xs text-slate-500 flex items-center justify-center space-x-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Secure Enterprise Verification • Milestone Consultancy</span>
          </p>
        </div>
      </div>
    </div>
  );
};
