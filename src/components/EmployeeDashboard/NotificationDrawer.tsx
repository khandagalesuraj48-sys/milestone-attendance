import React from 'react';
import { X, AlertCircle, Bell, Clock, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

import { User } from '../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notice: { shiftType: string; date: string; message: string } | null;
  activeShift?: string | null;
  siteName?: string;
  user?: User | null;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notice,
  activeShift,
  siteName,
}) => {
  if (!isOpen) return null;

  const hasNotifications = !!notice || !!activeShift;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Notifications & Alerts</h3>
                <p className="text-[11px] text-slate-400 font-medium">Shift updates & system notices</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-slate-100">
            {/* 1. Auto Sign Out Notice if active */}
            {notice && (
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 shadow-2xs">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-xs text-amber-900">Automatic Shift Close</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 font-bold">
                        {notice.shiftType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                      {notice.message}
                    </p>
                    <div className="mt-2 text-[10px] text-amber-800 font-medium bg-amber-100/60 p-1.5 rounded-lg border border-amber-200/60">
                      Policy Credit: <strong>PRESENT_HALF_DAY</strong> applied.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Active Shift Status Notification */}
            {activeShift && (
              <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 shadow-2xs pt-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-emerald-900">Shift In Progress</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">
                        Live
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 mt-1">
                      You are currently signed in for the <strong className="text-emerald-900">{activeShift} Shift</strong> at {siteName || 'Assigned Site'}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Site Policy Compliance Notice */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800 shadow-2xs pt-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-slate-900">Geofence Attendance Protection</h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Attendance is verified using server-authoritative GPS perimeter validation for Milestone project sites.
                  </p>
                </div>
              </div>
            </div>

            {!hasNotifications && (
              <div className="py-12 text-center text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-700">No New Notifications</p>
                <p className="text-[11px] text-slate-500 mt-0.5">You are up to date on all shift notices.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              Close Notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
