import React from 'react';
import { AttendanceRecord } from '../../types';
import { Sun, Moon, Clock, CheckCircle2, Sparkles, Building2, MapPin } from 'lucide-react';

interface TodayShiftListProps {
  shifts?: AttendanceRecord[];
}

export const TodayShiftList: React.FC<TodayShiftListProps> = ({ shifts = [] }) => {
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusBadge = (status: string, state?: string, sessionStatus?: string) => {
    if (sessionStatus === 'OPEN' || state === 'SIGNED_IN') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Active Session</span>
        </span>
      );
    }
    if (state === 'AUTO_SIGNED_OUT') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          Auto Closed (Half Day)
        </span>
      );
    }
    if (status === 'PRESENT_FULL_DAY') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          Full Day
        </span>
      );
    }
    if (status === 'PRESENT_HALF_DAY') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          Half Day
        </span>
      );
    }
    if (status === 'ABSENT') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          Absent
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        {status}
      </span>
    );
  };

  return (
    <div id="today-shifts-container" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-slate-900">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Today's Shift Activity</h3>
          <p className="text-xs text-slate-500">Record of your shifts logged today</p>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
          {shifts.length} {shifts.length === 1 ? 'Shift' : 'Shifts'}
        </div>
      </div>

      {shifts.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200 mt-4">
          No attendance records logged today yet.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {shifts.map((record) => {
            const recId = record.recordId || record.id;
            const isOpen = record.sessionStatus === 'OPEN' || record.attendanceState === 'SIGNED_IN';
            return (
              <div
                key={recId}
                className={`p-4 rounded-2xl border transition ${
                  isOpen
                    ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        record.shiftType === 'DAY'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {record.shiftType === 'DAY' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900">{record.shiftType} Shift</span>
                        {record.isExtraShift && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center space-x-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Extra Night</span>
                          </span>
                        )}
                        {record.isLate && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200">
                            Late Mark
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5 flex items-center space-x-1.5">
                        <span className="font-medium text-slate-900">{record.siteNameSnapshot || 'Project Site'}</span>
                        <span>&bull;</span>
                        <span>{record.locationNameSnapshot || 'Site Office'}</span>
                      </div>
                    </div>
                  </div>

                  <div>{getStatusBadge(record.attendanceStatus, record.attendanceState, record.sessionStatus)}</div>
                </div>

                {/* Time Breakdown */}
                <div className="mt-3 pt-3 border-t border-slate-200/70 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Sign In</div>
                    <div className="font-mono text-slate-900 font-semibold mt-0.5">{formatTime(record.signInTime)}</div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Sign Out</div>
                    <div className="font-mono text-slate-900 font-semibold mt-0.5">
                      {isOpen ? 'ACTIVE' : formatTime(record.signOutTime)}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Duration</div>
                    <div className="font-mono text-slate-900 font-bold mt-0.5">
                      {isOpen
                        ? 'Counting...'
                        : `${Math.floor((record.workingMinutes || 0) / 60)}h ${(record.workingMinutes || 0) % 60}m`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
