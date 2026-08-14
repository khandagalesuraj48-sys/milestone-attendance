import React, { useState, useEffect } from 'react';
import { AttendanceRecord } from '../../types';
import { api } from '../../lib/api';
import { Calendar, CheckCircle2, Clock, ChevronLeft, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';

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
    <div id="monthly-register-container" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
      {/* Header with Month Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Monthly Attendance Register</h3>
          <p className="text-xs text-slate-500 mt-0.5">Your complete monthly workforce attendance and shift records</p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition shadow-xs"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold px-3 text-slate-900">{month}</span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition shadow-xs"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly Summary Statistics Grid */}
      {stats && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Present</div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono mt-1.5">
              {stats.presentCount !== undefined ? stats.presentCount : (stats.fullDays || 0) + (stats.halfDays ? stats.halfDays * 0.5 : 0)}
              <span className="text-xs font-sans text-slate-400 font-normal ml-1">days</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {stats.fullDays || 0} Full &bull; {stats.halfDays || 0} Half
            </div>
          </div>

          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Absent</div>
            <div className="text-2xl sm:text-3xl font-bold text-rose-700 font-mono mt-1.5">
              {stats.absentDays || 0}
              <span className="text-xs font-sans text-slate-400 font-normal ml-1">days</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Unrecorded or missed</div>
          </div>

          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Late Marks</div>
            <div className="text-2xl sm:text-3xl font-bold text-amber-700 font-mono mt-1.5">
              {stats.lateCountInMonth || stats.lateCount || 0}
              <span className="text-xs font-sans text-slate-400 font-normal ml-1">/ 3 allowance</span>
            </div>
            {(stats.lateCountInMonth || stats.lateCount || 0) >= 4 ? (
              <div className="text-[11px] text-rose-600 font-semibold mt-1">Penalty Active (Half Day)</div>
            ) : (
              <div className="text-[11px] text-slate-500 mt-1">Within normal grace limit</div>
            )}
          </div>

          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Hours</div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono mt-1.5">
              {stats.totalHours || 0}
              <span className="text-xs font-sans text-slate-400 font-normal ml-1">hrs</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {stats.extraNights ? `${stats.extraNights} Extra Night Shifts` : 'Logged work duration'}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records List / Table */}
      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading monthly register...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
            No attendance records found for {month}.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="pb-3 px-3">Date (IST)</th>
                <th className="pb-3 px-3">Site & Location</th>
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
                const isOpen = r.sessionStatus === 'OPEN' || r.attendanceState === 'SIGNED_IN';
                return (
                  <tr key={recId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-3 font-mono font-semibold text-slate-900">
                      {r.businessDate || r.attendanceDate}
                    </td>
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
                      {isOpen ? (
                        <span className="text-emerald-600 font-semibold">ACTIVE</span>
                      ) : (
                        formatTime(r.signOutTime)
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-700">
                      {isOpen
                        ? 'Counting...'
                        : `${Math.floor((r.workingMinutes || 0) / 60)}h ${(r.workingMinutes || 0) % 60}m`}
                    </td>
                    <td className="py-3.5 px-3">
                      {isOpen && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          On Shift
                        </span>
                      )}
                      {!isOpen && r.attendanceStatus === 'PRESENT_FULL_DAY' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Full Day
                        </span>
                      )}
                      {!isOpen && r.attendanceStatus === 'PRESENT_HALF_DAY' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Half Day
                        </span>
                      )}
                      {!isOpen && r.attendanceStatus === 'ABSENT' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                          Absent
                        </span>
                      )}
                      {!isOpen && !['PRESENT_FULL_DAY', 'PRESENT_HALF_DAY', 'ABSENT'].includes(r.attendanceStatus) && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {r.attendanceStatus}
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
