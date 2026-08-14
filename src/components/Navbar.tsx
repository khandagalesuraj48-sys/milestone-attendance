import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Clock, LogOut, Building2, Shield, Menu, X, CheckCircle2 } from 'lucide-react';
import { EmployeeAvatar } from './common/EmployeeAvatar';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onProfileClick?: () => void;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onProfileClick,
  onMobileMenuToggle,
  isMobileMenuOpen,
}) => {
  const [istTime, setIstTime] = useState<string>('');
  const [istDate, setIstDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setIstTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setIstDate(
        now.toLocaleDateString('en-US', {
          timeZone: 'Asia/Kolkata',
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header id="main-header" className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Identity */}
          <div className="flex items-center space-x-3">
            {onMobileMenuToggle && (
              <button
                type="button"
                onClick={onMobileMenuToggle}
                className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-inner shrink-0">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  MILESTONE ATTENDANCE
                </span>
                {user?.role === 'admin' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    COMMAND CENTER
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                    STAFF PORTAL
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Milestone Consultancy &bull; Multi-Site Operations
              </p>
            </div>
          </div>

          {/* Center Live IST Clock */}
          <div className="hidden md:flex items-center space-x-3 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 shadow-inner">
            <div className="flex items-center space-x-1.5 text-xs text-slate-300">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">{istDate}</span>
            </div>
            <div className="w-px h-3.5 bg-slate-700" />
            <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-amber-400 tracking-wider">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{istTime ? `${istTime} IST` : 'Loading IST...'}</span>
            </div>
          </div>

          {/* User Profile & Quick Actions */}
          {user && (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                type="button"
                onClick={onProfileClick}
                className={`flex items-center space-x-2.5 p-1 sm:p-1.5 rounded-2xl transition text-left ${
                  onProfileClick ? 'hover:bg-slate-800 cursor-pointer' : ''
                }`}
                title={onProfileClick ? 'View My Profile' : undefined}
              >
                <EmployeeAvatar
                  name={user.fullName || 'User'}
                  size="sm"
                  status={user.accountStatus === 'ACTIVE' ? 'ACTIVE' : null}
                />
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-100 leading-tight truncate max-w-[140px]">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium leading-tight">
                    {user.designation || (user.role === 'admin' ? 'Administrator' : 'Staff')} &bull;{' '}
                    <span className="font-mono">{user.employeeId}</span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onLogout}
                title="Sign Out of Session"
                className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
