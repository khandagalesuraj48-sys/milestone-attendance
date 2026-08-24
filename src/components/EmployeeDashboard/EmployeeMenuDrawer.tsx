import React from 'react';
import { User } from '../../types';
import { EmployeeAvatar } from '../common/EmployeeAvatar';
import {
  X,
  Clock,
  Calendar,
  FileText,
  User as UserIcon,
  LogOut,
  ChevronRight,
} from 'lucide-react';

interface EmployeeMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentTab: string;
  onSelectTab: (tab: 'SHIFT' | 'HISTORY' | 'LEAVE' | 'PROFILE') => void;
  onLogout: () => void;
  siteName?: string;
}

export const EmployeeMenuDrawer: React.FC<EmployeeMenuDrawerProps> = ({
  isOpen,
  onClose,
  user,
  currentTab,
  onSelectTab,
  onLogout,
}) => {
  if (!isOpen || !user) return null;

  const navItems = [
    {
      id: 'SHIFT' as const,
      label: 'Shift & Attendance',
      description: 'Daily sign-in, live status & today records',
      icon: Clock,
      color: 'text-amber-500 bg-amber-50 border-amber-200',
    },
    {
      id: 'HISTORY' as const,
      label: 'Monthly Register',
      description: 'Monthly calendar, day units & overtime',
      icon: Calendar,
      color: 'text-blue-500 bg-blue-50 border-blue-200',
    },
    {
      id: 'LEAVE' as const,
      label: 'Leave Requests',
      description: 'Submit & view leave applications',
      icon: FileText,
      color: 'text-emerald-500 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'PROFILE' as const,
      label: 'My Profile',
      description: 'Personal details, credentials & photo',
      icon: UserIcon,
      color: 'text-purple-500 bg-purple-50 border-purple-200',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Top Header */}
          <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-white/95 p-0.5 flex items-center justify-center">
                <img
                  src="/assets/branding/milestone-logo.svg"
                  alt="Milestone"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-extrabold text-xs tracking-wider text-slate-100 uppercase">
                Employee Navigation
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card Summary */}
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center space-x-3.5">
              <EmployeeAvatar
                name={user.fullName || 'User'}
                imageUrl={user.photoUrl}
                size="md"
                className="ring-2 ring-white shadow-xs shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 truncate">{user.fullName}</h4>
                <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                  {user.designation || 'Site Staff'}
                </p>
                <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-500 font-mono">
                  <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{user.employeeId}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full p-3 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isActive ? 'bg-slate-800 border-slate-700 text-amber-400' : item.color
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                        {item.label}
                      </div>
                      <div className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                      isActive ? 'text-slate-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Bottom Logout Action */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 font-bold text-xs flex items-center justify-center space-x-2 transition shadow-2xs cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Log Out of Session</span>
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Milestone Consultancy Attendance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
