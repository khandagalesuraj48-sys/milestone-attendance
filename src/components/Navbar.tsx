import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Clock, LogOut, Building2 } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onProfileClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onProfileClick }) => {
  const [istTime, setIstTime] = useState<string>('');

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
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header id="main-header" className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-xs shrink-0">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-slate-900">MILESTONE CONSULTANCY</span>
                {user?.role === 'admin' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wide">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Workforce Attendance
              </p>
            </div>
          </div>

          {/* Center Clock (Authoritative IST) */}
          <div className="hidden md:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-mono text-slate-800 tracking-wider font-semibold">{istTime || 'Loading IST...'}</span>
          </div>

          {/* User Profile & Actions */}
          {user && (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                type="button"
                onClick={onProfileClick}
                className={`flex items-center space-x-2.5 p-1.5 rounded-2xl transition text-left ${
                  onProfileClick ? 'hover:bg-slate-100 cursor-pointer' : ''
                }`}
                title={onProfileClick ? 'View My Profile' : undefined}
              >
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {user.fullName ? user.fullName.charAt(0) : 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">{user.fullName}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    {user.designation || (user.role === 'admin' ? 'Administrator' : 'Employee')} &bull; {user.employeeId}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
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
