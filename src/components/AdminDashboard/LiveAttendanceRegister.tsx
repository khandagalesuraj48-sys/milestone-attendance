import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Site } from '../../types';
import { api } from '../../lib/api';
import { Filter, Download, Edit3, Sun, Moon, Sparkles, AlertTriangle, CheckCircle, RefreshCw, MapPin, Building2 } from 'lucide-react';

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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
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
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Master Attendance Register & Muster</h3>
          <p className="text-xs text-slate-500">Authoritative workforce record with Multi-Site immutable snapshots</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchRegister}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center space-x-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="block text-slate-600 font-semibold mb-1">Business Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 outline-hidden"
          />
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">Project Site</label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 outline-hidden"
          >
            <option value="ALL">All Sites</option>
            {sites.map((s) => (
              <option key={s.siteId} value={s.siteId}>
                {s.siteName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">Shift</label>
          <select
            value={shiftType}
            onChange={(e) => setShiftType(e.target.value)}
            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 outline-hidden"
          >
            <option value="ALL">All Shifts</option>
            <option value="DAY">DAY (08:00–17:00)</option>
            <option value="NIGHT">NIGHT (19:00–04:00)</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">Extra Shift</label>
          <select
            value={isExtraShift}
            onChange={(e) => setIsExtraShift(e.target.value)}
            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 outline-hidden"
          >
            <option value="ALL">All Records</option>
            <option value="true">Extra Night Only</option>
            <option value="false">Standard Shifts Only</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">Final Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT_FULL_DAY">Full Day</option>
            <option value="PRESENT_HALF_DAY">Half Day</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>
      </div>

      {/* Register Table */}
      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading master attendance register...</div>
        ) : records.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No attendance records matched the filter criteria for {date}.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="pb-3 px-3">Employee</th>
                <th className="pb-3 px-3">Site & Location Snapshot</th>
                <th className="pb-3 px-3">Shift</th>
                <th className="pb-3 px-3">Sign In</th>
                <th className="pb-3 px-3">Sign Out</th>
                <th className="pb-3 px-3">Duration</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => {
                const recId = r.recordId || r.id;
                const isOpen = r.sessionStatus === 'OPEN' || r.attendanceState === 'SIGNED_IN';
                return (
                  <tr key={recId} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900">{r.employeeName}</div>
                      <div className="font-mono text-[10px] text-slate-500">{r.employeeId}</div>
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
                        <span className="text-emerald-700 font-bold">WORKING</span>
                      ) : (
                        formatTime(r.signOutTime)
                      )}
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
                      {r.isCorrected && (
                        <span className="ml-1 text-[9px] font-semibold px-1 py-0.5 rounded bg-blue-100 text-blue-800">
                          Corrected
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => onOpenCorrection(r)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center space-x-1 inline-flex transition"
                      >
                        <Edit3 className="w-3 h-3 text-slate-600" />
                        <span>Correct</span>
                      </button>
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
