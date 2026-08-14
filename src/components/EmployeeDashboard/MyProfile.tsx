import React, { useState, useEffect } from 'react';
import { User, Employee, Site } from '../../types';
import { api } from '../../lib/api';
import {
  User as UserIcon,
  Shield,
  KeyRound,
  Building2,
  Phone,
  Mail,
  Briefcase,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
} from 'lucide-react';

interface MyProfileProps {
  user: User;
  onUserUpdated?: (user: User) => void;
}

export const MyProfile: React.FC<MyProfileProps> = ({ user, onUserUpdated }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  // Password Change State
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.getMyProfile();
        if (res.success) {
          if (res.employee) setEmployee(res.employee);
          if (res.assignedSites) setAssignedSites(res.assignedSites);
        }
      } catch (err) {
        console.error('Failed to load profile details', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (cleanPass.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await api.changePassword(cleanPass, cleanConfirm);
      if (res.success) {
        setPasswordSuccess('Your password has been successfully updated.');
        setNewPassword('');
        setConfirmPassword('');
        if (onUserUpdated && res.user) {
          onUserUpdated(res.user);
        }
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div id="my-profile-container" className="space-y-6">
      {/* Profile Overview Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-bold tracking-tight shadow-xs">
              {user.fullName ? user.fullName.charAt(0) : 'U'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{user.fullName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {user.accountStatus || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {employee?.designation || user.designation || 'Staff Member'} &bull; {user.employeeId}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {employee?.boundHardwareSignature && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                <span>Device Verified</span>
              </span>
            )}
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Employee Account</span>
            </span>
          </div>
        </div>

        {/* Read-Only Information Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium mb-1">
              <UserIcon className="w-3.5 h-3.5" />
              <span>Employee ID / Number</span>
            </div>
            <div className="text-sm font-mono font-bold text-slate-900">{user.employeeId}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium mb-1">
              <UserIcon className="w-3.5 h-3.5" />
              <span>System Username</span>
            </div>
            <div className="text-sm font-semibold text-slate-900">{user.username || user.employeeId}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium mb-1">
              <Mail className="w-3.5 h-3.5" />
              <span>Email Address</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 truncate">
              {employee?.email || user.email || 'Not Specified'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium mb-1">
              <Phone className="w-3.5 h-3.5" />
              <span>Mobile Contact</span>
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {employee?.mobile || 'Not Specified'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium mb-1">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Department</span>
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {employee?.department || user.department || 'Operations'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium mb-1">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Designation</span>
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {employee?.designation || user.designation || 'Staff'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joining Date</span>
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {employee?.joiningDate || 'Active'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 sm:col-span-2">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium mb-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>Assigned Project Sites</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {assignedSites.length > 0 ? (
                assignedSites.map((s) => (
                  <span
                    key={s.siteId}
                    className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    {s.siteName}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">Authorized project locations</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
          Note: To update your personal details, designation, or site assignments, please contact your workforce administrator.
        </div>
      </div>

      {/* Security & Password Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center space-x-3 pb-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Change Password</h3>
            <p className="text-xs text-slate-500">Update your login credentials securely</p>
          </div>
        </div>

        {passwordError && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="mt-6 space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              New Password <span className="text-slate-400 font-normal">(min. 8 characters)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={8}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden transition pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Confirm New Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              minLength={8}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordLoading || !newPassword || !confirmPassword}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-sm rounded-2xl transition shadow-xs disabled:opacity-50 flex items-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
