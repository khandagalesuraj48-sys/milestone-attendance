import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Site } from '../../types';
import { api } from '../../lib/api';
import { EmployeeAvatar } from '../common/EmployeeAvatar';
import {
  Filter,
  Download,
  Edit3,
  Sun,
  Moon,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  MapPin,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Layers,
} from 'lucide-react';

interface LiveAttendanceRegisterProps {
  onOpenCorrection: (record: AttendanceRecord) => void;
  refreshTrigger: number;
}

export const LiveAttendanceRegister: React.FC<LiveAttendanceRegisterProps> = ({
  onOpenCorrection,
  refreshTrigger,
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [siteId, setSiteId] = useState('ALL');
  const [shiftType, setShiftType] = useState('ALL');
  const [isExtraShift, setIsExtraShift] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  useEffect(() => {
    const loadSites = async () => {
      try {
        const res = await api.getSites();
        if (res.success) {
          setSites(res.sites);
        }
      } catch (err) {
        console.error('Failed to load sites for register', err);
      }
    };
    loadSites();
  }, []);

  const fetchRegister = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminAttendance({
        date: date || undefined,
        siteId: siteId !== 'ALL' ? siteId : undefined,
        shiftType: shiftType !== 'ALL' ? shiftType : undefined,
        isExtraShift: isExtraShift !== 'ALL' ? isExtraShift : undefined,
        status: status !== 'ALL' ? status : undefined,
      });
      setRecords(res.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegister();
  }, [date, siteId, shiftType, isExtraShift, status, refreshTrigger]);

  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'Record ID',
      'Employee ID',
      'Employee Name',
      'Business Date',
      'Site Name Snapshot',
      'Location Name Snapshot',
      'Shift Type',
      'Extra Shift',
      'Session Status',
      'Attendance Status',
      'Sign In Time (IST)',
      'Sign Out Time (IST)',
      'Working Minutes',
      'Working Hours',
      'Is Late',
      'Sign Out Type',
      'Is Corrected',
    ];

    const rows = records.map((r) => [
      r.recordId || r.id,
      r.employeeId,
      `"${r.employeeName || ''}"`,
      r.businessDate || r.attendanceDate,
      `"${r.siteNameSnapshot || ''}"`,
      `"${r.locationNameSnapshot || ''}"`,
      r.shiftType,
      r.isExtraShift ? 'EXTRA_NIGHT' : 'NO',
      r.sessionStatus || r.attendanceState,
      r.attendanceStatus,
      r.signInTime ? new Date(r.signInTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) : '',
      r.signOutTime ? new Date(r.signOutTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) : '',
      r.workingMinutes || 0,
      ((r.workingMinutes || 0) / 60).toFixed(2),
      r.isLate ? 'YES' : 'NO',
      r.signOutType || '',
      r.isCorrected ? 'YES' : 'NO',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Milestone_Attendance_${date || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div id="live-attendance-register" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Master Attendance Register & Muster
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
              {records.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative workforce record with immutable site snapshots & audit history
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchRegister}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Refresh Attendance Muster"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-2 transition shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Muster</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Attendance Date
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Project Site
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none appearance-none"
            >
              <option value="ALL">All Project Sites</option>
              {sites.map((s) => (
                <option key={s.siteId} value={s.siteId}>
                  {s.siteName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Shift Schedule
          </label>
          <select
            value={shiftType}
            onChange={(e) => setShiftType(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Shifts</option>
            <option value="DAY">DAY (08:00–17:00 IST)</option>
            <option value="NIGHT">NIGHT (19:00–04:00 IST)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Extra Night Shift
          </label>
          <select
            value={isExtraShift}
            onChange={(e) => setIsExtraShift(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Records</option>
            <option value="true">Extra Night Only</option>
            <option value="false">Standard Shifts Only</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Final Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT_FULL_DAY">Full Day</option>
            <option value="PRESENT_HALF_DAY">Half Day</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="mt-6 hidden md:block overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-medium">Loading master attendance muster...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 font-medium">
            No attendance records matched the filter criteria for {date}.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 px-3">Employee</th>
                <th className="pb-3 px-3">Project Site & Gate</th>
                <th className="pb-3 px-3">Shift Type</th>
                <th className="pb-3 px-3">In (IST)</th>
                <th className="pb-3 px-3">Out (IST)</th>
                <th className="pb-3 px-3">Duration</th>
                <th className="pb-3 px-3">Muster Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => {
                const recId = r.recordId || r.id;
                const isOpen = r.sessionStatus === 'OPEN' || r.attendanceState === 'SIGNED_IN' || !r.signOutTime;
                return (
                  <tr key={recId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-3">
                        <EmployeeAvatar
                          name={r.employeeName}
                          size="md"
                          status={isOpen ? 'WORKING' : r.isLate ? 'LATE' : 'PRESENT'}
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{r.employeeName}</div>
                          <div className="font-mono text-[10px] text-slate-400 font-semibold">{r.employeeId}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800">{r.siteNameSnapshot || 'Project Site'}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{r.locationNameSnapshot || 'Gate'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
                            r.shiftType === 'NIGHT'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {r.shiftType === 'NIGHT' ? <Moon className="w-2.5 h-2.5" /> : <Sun className="w-2.5 h-2.5" />}
                          <span>{r.shiftType}</span>
                        </span>

                        {r.isExtraShift && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            EXTRA
                          </span>
                        )}
                        {r.isLate && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            LATE
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900 text-xs">
                      {formatTime(r.signInTime)}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-xs">
                      {isOpen ? (
                        <span className="text-emerald-700 font-bold flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>WORKING</span>
                        </span>
                      ) : (
                        <span className="text-slate-900 font-bold">{formatTime(r.signOutTime)}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-600 font-semibold text-xs">
                      {Math.floor((r.workingMinutes || 0) / 60)}h {(r.workingMinutes || 0) % 60}m
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-1">
                        {r.attendanceStatus === 'PRESENT_FULL_DAY' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Full Day
                          </span>
                        )}
                        {r.attendanceStatus === 'PRESENT_HALF_DAY' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Half Day
                          </span>
                        )}
                        {r.attendanceStatus === 'ABSENT' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Absent
                          </span>
                        )}
                        {r.isCorrected && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            Corrected
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => onOpenCorrection(r)}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-slate-200 text-slate-700 transition inline-flex items-center space-x-1"
                        title="Correct Record"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-[11px] font-semibold">Correct</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="mt-6 md:hidden space-y-3">
        {records.map((r) => {
          const recId = r.recordId || r.id;
          const isOpen = r.sessionStatus === 'OPEN' || r.attendanceState === 'SIGNED_IN' || !r.signOutTime;

          return (
            <div key={recId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <EmployeeAvatar
                    name={r.employeeName}
                    size="md"
                    status={isOpen ? 'WORKING' : r.isLate ? 'LATE' : 'PRESENT'}
                  />
                  <div>
                    <div className="font-bold text-sm text-slate-900">{r.employeeName}</div>
                    <div className="font-mono text-[10px] text-slate-400">{r.employeeId}</div>
                    <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                      {r.siteNameSnapshot} &bull; {r.locationNameSnapshot}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    r.attendanceStatus === 'PRESENT_FULL_DAY'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {r.attendanceStatus?.replace('PRESENT_', '') || 'LOGGED'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                <div className="font-mono text-slate-700">
                  <span className="font-bold">{formatTime(r.signInTime)}</span> →{' '}
                  <span className="font-bold">{isOpen ? 'WORKING' : formatTime(r.signOutTime)}</span>
                </div>

                <button
                  onClick={() => onOpenCorrection(r)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-[11px] flex items-center space-x-1"
                >
                  <Edit3 className="w-3 h-3 text-slate-600" />
                  <span>Correct</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
