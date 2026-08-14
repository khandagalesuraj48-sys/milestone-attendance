import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import {
  Clock,
  LogOut,
  Menu,
  X,
  Calendar,
  FileText,
  User as UserIcon,
  Shield,
  Clock3,
} from 'lucide-react';
import { EmployeeAvatar } from './common/EmployeeAvatar';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onProfileClick?: () => void;
  onSelectTab?: (tab: 'SHIFT' | 'HISTORY' | 'LEAVE' | 'PROFILE') => void;
  currentTab?: string;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onProfileClick,
  onSelectTab,
  currentTab,
  onMobileMenuToggle,
  isMobileMenuOpen,
}) => {
  const [istTime, setIstTime] = useState<string>('');
  const [istDate, setIstDate] = useState<string>('');
  const [isEmpMenuOpen, setIsEmpMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close employee dropdown menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsEmpMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabClick = (tab: 'SHIFT' | 'HISTORY' | 'LEAVE' | 'PROFILE') => {
    setIsEmpMenuOpen(false);
    if (onSelectTab) {
      onSelectTab(tab);
    }
  };

  const isEmployee = user?.role !== 'admin';

  return (
    <header id="main-header" className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Identity */}
          <div className="flex items-center space-x-3">
            {/* Admin Mobile Sidebar Toggle */}
            {!isEmployee && onMobileMenuToggle && (
              <button
                type="button"
                onClick={onMobileMenuToggle}
                className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            {/* Official Milestone Logo */}
            <div className="w-10 h-10 p-1 rounded-xl bg-white/95 border border-slate-700/80 shadow-xs flex items-center justify-center shrink-0">
              <img
                src="/assets/branding/milestone-logo.svg"
                alt="Milestone Consultancy"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  MILESTONE CONSULTANCY
                </span>
                {!isEmployee && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    COMMAND CENTER
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Workforce Management & Multi-Site Operations
              </p>
            </div>
          </div>

          {/* Center Live IST Clock (Admin / Desktop) */}
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

          {/* Right Section: User Profile & Actions */}
          {user && (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Employee Header Profile View */}
              <button
                type="button"
                onClick={onProfileClick}
                className="flex items-center space-x-2.5 p-1 sm:p-1.5 rounded-2xl transition text-left hover:bg-slate-800 cursor-pointer"
                title="View My Profile"
              >
                <EmployeeAvatar
                  name={user.fullName || 'User'}
                  imageUrl={user.photoUrl}
                  size="sm"
                  status={user.accountStatus === 'ACTIVE' ? 'ACTIVE' : null}
                />
                <div className="block text-left">
                  <div className="text-xs font-bold text-slate-100 leading-tight truncate max-w-[130px] sm:max-w-[160px]">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium leading-tight">
                    {user.designation || (isEmployee ? 'Staff' : 'Administrator')}
                  </div>
                </div>
              </button>

              {/* Employee Dedicated 3-Line Hamburger Menu */}
              {isEmployee && (
                <div className="relative" ref={menuRef}>
                  <button
                    id="employee-nav-menu-button"
                    type="button"
                    onClick={() => setIsEmpMenuOpen(!isEmpMenuOpen)}
                    className="p-2 sm:p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition cursor-pointer"
                    aria-label="Open Employee Menu"
                    title="Menu"
                  >
                    {isEmpMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>

                  {/* Employee Dropdown Menu */}
                  {isEmpMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-slate-900 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user.employeeId}</p>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => handleTabClick('SHIFT')}
                          className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-slate-50 transition ${
                            currentTab === 'SHIFT' ? 'text-slate-900 font-bold bg-slate-50' : 'text-slate-700'
                          }`}
                        >
                          <Clock3 className="w-4 h-4 text-amber-500" />
                          <span>Shift & Attendance</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTabClick('HISTORY')}
                          className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-slate-50 transition ${
                            currentTab === 'HISTORY' ? 'text-slate-900 font-bold bg-slate-50' : 'text-slate-700'
                          }`}
                        >
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span>Monthly Register</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTabClick('LEAVE')}
                          className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-slate-50 transition ${
                            currentTab === 'LEAVE' ? 'text-slate-900 font-bold bg-slate-50' : 'text-slate-700'
                          }`}
                        >
                          <FileText className="w-4 h-4 text-emerald-500" />
                          <span>Leave Requests</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTabClick('PROFILE')}
                          className={`w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center space-x-2.5 hover:bg-slate-50 transition ${
                            currentTab === 'PROFILE' ? 'text-slate-900 font-bold bg-slate-50' : 'text-slate-700'
                          }`}
                        >
                          <UserIcon className="w-4 h-4 text-purple-500" />
                          <span>My Profile</span>
                        </button>
                      </div>

                      <div className="border-t border-slate-100 my-1"></div>

                      <div className="px-1 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEmpMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center space-x-2.5 transition cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Direct Logout Button */}
              {!isEmployee && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign Out of Session"
                  className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
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

