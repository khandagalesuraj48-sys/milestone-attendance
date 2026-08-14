import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  Clock,
  LogOut,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import { EmployeeAvatar } from './common/EmployeeAvatar';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onProfileClick?: () => void;
  onSelectTab?: (tab: 'SHIFT' | 'HISTORY' | 'LEAVE' | 'PROFILE' | 'TEAM_HIGHLIGHTS') => void;
  currentTab?: string;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
  onOpenEmployeeMenu?: () => void;
  onOpenNotifications?: () => void;
  notificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onProfileClick,
  onMobileMenuToggle,
  isMobileMenuOpen,
  onOpenEmployeeMenu,
  onOpenNotifications,
  notificationsCount = 0,
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

  const isEmployee = user?.role !== 'admin';

  return (
    <header id="main-header" className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left: Brand & Logo */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            {/* Admin Mobile Sidebar Toggle */}
            {!isEmployee && onMobileMenuToggle && (
              <button
                type="button"
                onClick={onMobileMenuToggle}
                className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            {/* Official Milestone Logo */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 p-0.5 sm:p-1 rounded-xl bg-white/95 border border-slate-700/80 shadow-2xs flex items-center justify-center shrink-0">
              <img
                src="/assets/branding/milestone-logo.svg"
                alt="Milestone Consultancy"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xs sm:text-sm md:text-base tracking-tight text-white truncate">
                  MILESTONE CONSULTANCY
                </span>
                {!isEmployee && (
                  <span className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    COMMAND
                  </span>
                )}
              </div>
              {!isEmployee && (
                <p className="text-[10px] text-slate-400 font-medium hidden md:block truncate">
                  Workforce Management & Multi-Site Operations
                </p>
              )}
            </div>
          </div>

          {/* Center: Live IST Clock (Admin Only / Desktop) */}
          {!isEmployee && (
            <div className="hidden md:flex items-center space-x-3 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 shadow-inner">
              <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium">{istDate}</span>
              </div>
              <div className="w-px h-3.5 bg-slate-700" />
              <div className="flex items-center space-x-1.5 font-mono text-xs font-bold text-amber-400 tracking-wider">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{istTime ? `${istTime} IST` : 'IST'}</span>
              </div>
            </div>
          )}

          {/* Right Section: User Profile, Notification Bell & Hamburger */}
          {user && (
            <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
              {/* Notification Bell (Employee & Admin) */}
              {isEmployee && onOpenNotifications && (
                <button
                  type="button"
                  onClick={onOpenNotifications}
                  className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Notifications & Alerts"
                  aria-label="Open notifications"
                >
                  <Bell className="w-5 h-5" />
                  {notificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-slate-900 animate-pulse" />
                  )}
                </button>
              )}

              {/* Employee Header Profile Quick View */}
              <button
                type="button"
                onClick={onProfileClick}
                className="flex items-center space-x-2 p-1 sm:p-1.5 rounded-xl transition text-left hover:bg-slate-800 cursor-pointer"
                title="View My Profile"
              >
                <EmployeeAvatar
                  name={user.fullName || 'User'}
                  imageUrl={user.photoUrl}
                  size="sm"
                  status={user.accountStatus === 'ACTIVE' ? 'ACTIVE' : null}
                />
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-100 leading-tight truncate max-w-[120px]">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium leading-tight truncate max-w-[120px]">
                    {user.designation || (isEmployee ? 'Site Staff' : 'Admin')}
                  </div>
                </div>
              </button>

              {/* Employee 3-Line Hamburger Menu Trigger */}
              {isEmployee && onOpenEmployeeMenu && (
                <button
                  id="employee-hamburger-button"
                  type="button"
                  onClick={onOpenEmployeeMenu}
                  className="p-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition cursor-pointer"
                  aria-label="Open Employee Menu"
                  title="Navigation Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}

              {/* Admin Direct Logout Button */}
              {!isEmployee && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign Out of Session"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};


