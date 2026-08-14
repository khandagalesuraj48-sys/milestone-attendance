import React, { useState, useEffect } from 'react';
import { AttendanceRecord } from '../../types';
import { api } from '../../lib/api';
import { Calendar, CheckCircle2, AlertCircle, Clock, Moon, Sparkles, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

export const MonthlyRegister: React.FC = () => {
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<any>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.getMyHistory(month);
      setRecords(res.records || []);
      setStats(res.stats || null);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [month]);

  const handlePrevMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div id="monthly-register-container" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-slate-900">
      {/* Header with Month Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Personal Monthly Attendance Register</h3>
          <p className="text-xs text-slate-500">Scoped strictly to authenticated user's attendance records</p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-white text-slate-600 transition shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold px-3 text-slate-900">{month}</span>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-white text-slate-600 transition shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-xs text-slate-500 font-semibold">Full Days</div>
            <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {stats.fullDays || 0}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-xs text-slate-500 font-semibold">Half Days</div>
            <div className="text-2xl font-bold text-amber-700 font-mono mt-1">
              {stats.halfDays || 0}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-xs text-slate-500 font-semibold">Late Marks</div>
            <div className="text-2xl font-bold text-rose-700 font-mono mt-1">
              {stats.lateCountInMonth || 0} <span className="text-xs text-slate-500 font-normal">/ 3 allowance</span>
            </div>
            {(stats.lateCountInMonth || 0) >= 4 && (
              <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Threshold Penalty Active (Half Day)</div>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-xs text-slate-500 font-semibold">Extra Night Shifts</div>
            <div className="text-2xl font-bold text-purple-700 font-mono mt-1">
              {stats.extraNights || 0}
            </div>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading monthly attendance register...</div>
        ) : records.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No attendance records found for {month}.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="pb-3 px-3">Date (IST)</th>
                <th className="pb-3 px-3">Site Snapshot</th>
                <th className="pb-3 px-3">Shift</th>
                <th className="pb-3 px-3">Sign In</th>
                <th className="pb-3 px-3">Sign Out</th>
                <th className="pb-3 px-3">Duration</th>
                <th className="pb-3 px-3">Status Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => {
                const recId = r.recordId || r.id;
                return (
                  <tr key={recId} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-3 font-mono font-semibold text-slate-900">{r.businessDate || r.attendanceDate}</td>
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-900">{r.siteNameSnapshot || 'Project Site'}</div>
                      <div className="text-[11px] text-slate-500">{r.locationNameSnapshot}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold">{r.shiftType}</span>
                        {r.isExtraShift && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                            EXTRA
                          </span>
                        )}
                        {r.isLate && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700">
                            LATE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-700">{formatTime(r.signInTime)}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-700">
                      {r.sessionStatus === 'OPEN' || r.attendanceState === 'SIGNED_IN' ? 'ACTIVE' : formatTime(r.signOutTime)}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-700">
                      {Math.floor((r.workingMinutes || 0) / 60)}h {(r.workingMinutes || 0) % 60}m
                    </td>
                    <td className="py-3.5 px-3">
                      {r.attendanceStatus === 'PRESENT_FULL_DAY' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Full Day
                        </span>
                      )}
                      {r.attendanceStatus === 'PRESENT_HALF_DAY' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Half Day
                        </span>
                      )}
                      {r.attendanceStatus === 'ABSENT' && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                          Absent
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
