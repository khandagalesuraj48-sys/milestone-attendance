import React, { useState } from 'react';
import { api } from '../lib/api';
import { User } from '../types';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LogOut,
  Building2,
  ShieldCheck,
} from 'lucide-react';

interface ForcePasswordChangeScreenProps {
  user: User;
  onPasswordChanged: (updatedUser: User) => void;
  onLogout: () => void;
}

export const ForcePasswordChangeScreen: React.FC<ForcePasswordChangeScreenProps> = ({
  user,
  onPasswordChanged,
  onLogout,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasMinLength = newPassword.length >= 8;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = hasMinLength && passwordsMatch && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!passwordsMatch) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.changePassword(newPassword, confirmPassword);
      if (res.success && res.user) {
        onPasswordChanged(res.user);
      } else {
        throw new Error(res.message || 'Failed to update password');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="force-password-change-screen" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Header */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 shadow-sm mb-4">
          <Building2 className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Milestone Consultancy
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium tracking-wide uppercase">
          Workforce Attendance & Site Geofence Platform
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-slate-200 shadow-sm">
          {/* Header Banner */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Set Permanent Password
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              First-time sign in detected. You must create a new permanent password before accessing your dashboard.
            </p>
          </div>

          {/* User Identification Chip */}
          <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Account</span>
              <span className="font-semibold text-slate-900">{user.fullName}</span>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Employee ID</span>
              <span className="font-mono font-medium text-slate-800">{user.employeeId}</span>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new-password-input"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition outline-hidden"
                  placeholder="Enter at least 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition outline-hidden"
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Live Requirements Check */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-[11px]">
              <div className="flex items-center space-x-2">
                <CheckCircle2
                  className={`w-3.5 h-3.5 shrink-0 ${
                    hasMinLength ? 'text-emerald-600' : 'text-slate-300'
                  }`}
                />
                <span className={hasMinLength ? 'text-emerald-800 font-medium' : 'text-slate-500'}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2
                  className={`w-3.5 h-3.5 shrink-0 ${
                    passwordsMatch ? 'text-emerald-600' : 'text-slate-300'
                  }`}
                />
                <span className={passwordsMatch ? 'text-emerald-800 font-medium' : 'text-slate-500'}>
                  Passwords match
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                id="submit-new-password-button"
                type="submit"
                disabled={!canSubmit}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Updating Password...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <span>Set Password & Access Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>

              <button
                id="force-password-logout-button"
                type="button"
                onClick={onLogout}
                disabled={loading}
                className="w-full flex items-center justify-center py-2 px-4 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out & Return Later
              </button>
            </div>
          </form>
        </div>

        {/* Security Assurance Footer */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>End-to-End Encrypted Authentication • Firebase Security Standard</span>
          </p>
        </div>
      </div>
    </div>
  );
};
