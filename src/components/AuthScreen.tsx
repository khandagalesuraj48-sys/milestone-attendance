import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight, AlertCircle, ShieldCheck, Mail, ShieldAlert, CheckCircle2, RefreshCw, KeyRound } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Login form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // First admin setup states
  const [setupFullName, setSetupFullName] = useState('');
  const [setupUsername, setSetupUsername] = useState('admin');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  const checkSystemStatus = async () => {
    try {
      setCheckingStatus(true);
      const status = await api.getSystemStatus();
      if (status.isFirstSetupRequired) {
        setIsFirstSetup(true);
      }
    } catch {
      // Ignore network hiccup on initial load
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError('');
    setSuccessMsg('');
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

  const handleFirstAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!setupFullName.trim() || !setupUsername.trim() || !setupPassword) {
      setError('Please fill in all required setup fields.');
      return;
    }

    if (setupPassword.length < 8) {
      setError('Administrator password must be at least 8 characters long.');
      return;
    }

    if (setupPassword !== setupConfirmPassword) {
      setError('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    setSetupLoading(true);

    try {
      const res = await api.setupFirstAdmin({
        fullName: setupFullName.trim(),
        username: setupUsername.trim(),
        email: setupEmail.trim() || `${setupUsername.trim().toLowerCase()}@milestoneconsultancy.in`,
        password: setupPassword,
      });

      setSuccessMsg('Administrator account provisioned successfully! Signing in...');

      // Auto login with the newly created admin
      try {
        const loginRes = await api.login(setupUsername.trim(), setupPassword);
        onLoginSuccess(loginRes.user);
      } catch {
        setIsFirstSetup(false);
        setUsername(setupUsername.trim());
        setPassword(setupPassword);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize first administrator.');
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div id="auth-portal-screen" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-slate-900 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo */}
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
          {isFirstSetup ? (
            <div>
              <div className="mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2 text-indigo-600 mb-1">
                  <KeyRound className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-wider">Initial Setup</span>
                </div>
                <h2 className="text-base font-bold text-slate-900">Provision First Administrator</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  The system is fresh with 0 business records. Create your primary administrator identity to begin.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleFirstAdminSetup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Administrator Full Name *
                  </label>
                  <input
                    id="setup-fullname-input"
                    type="text"
                    required
                    value={setupFullName}
                    onChange={(e) => setSetupFullName(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition outline-hidden font-medium"
                    placeholder="e.g. Master Administrator"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Admin Username *
                  </label>
                  <input
                    id="setup-username-input"
                    type="text"
                    required
                    value={setupUsername}
                    onChange={(e) => setSetupUsername(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition outline-hidden font-medium"
                    placeholder="admin"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Official Admin Email (Optional)
                  </label>
                  <input
                    id="setup-email-input"
                    type="email"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition outline-hidden font-medium"
                    placeholder="admin@milestoneconsultancy.in"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Admin Password (Min. 8 characters) *
                  </label>
                  <input
                    id="setup-password-input"
                    type="password"
                    required
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition outline-hidden font-medium"
                    placeholder="••••••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Confirm Password *
                  </label>
                  <input
                    id="setup-confirm-password-input"
                    type="password"
                    required
                    value={setupConfirmPassword}
                    onChange={(e) => setSetupConfirmPassword(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition outline-hidden font-medium"
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="pt-2">
                  <button
                    id="setup-admin-submit-button"
                    type="submit"
                    disabled={setupLoading}
                    className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {setupLoading ? (
                      <span className="flex items-center space-x-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Provisioning Administrator...</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-2">
                        <span>Initialize System & Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFirstSetup(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
                  >
                    Already have an account? Sign In
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
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

              {successMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{successMsg}</span>
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

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFirstSetup(true)}
                    className="text-xs text-slate-400 hover:text-slate-700 font-medium transition cursor-pointer"
                  >
                    Need to set up the first administrator account?
                  </button>
                </div>
              </form>
            </div>
          )}
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
