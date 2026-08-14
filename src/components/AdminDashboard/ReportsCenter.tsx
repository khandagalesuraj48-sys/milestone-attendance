import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FileText, Download, RefreshCw, Sparkles, AlertTriangle, Calendar } from 'lucide-react';

export const ReportsCenter: React.FC = () => {
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [department, setDepartment] = useState('ALL');
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminReport(month, department !== 'ALL' ? department : undefined);
      setReport(res.report || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month, department]);

  const handleExportCSV = () => {
    if (report.length === 0) return;

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Reporting Month',
      'Present Full Days',
      'Present Half Days',
      'Absent Days',
      'Late Marks',
      'Extra Night Shifts',
      'Approved Leave Days',
      'Total Working Hours',
    ];

    const rows = report.map((r) => [
      r.employeeId,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      r.month,
      r.presentFullDays,
      r.presentHalfDays,
      r.absentDays,
      r.lateCount,
      r.extraNightCount,
      r.leaveDays,
      r.totalWorkingHours,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Milestone_Monthly_Muster_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="reports-center" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Monthly Workforce Muster Report</h3>
          <p className="text-xs text-slate-500">Aggregated attendance totals, late penalties, and extra night tallies</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchReport}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center space-x-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="btn-export-muster-csv"
            onClick={handleExportCSV}
            disabled={report.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Monthly Muster CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-slate-600 font-semibold mb-1">Select Reporting Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 outline-hidden"
          />
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1">Department Filter</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 outline-hidden"
          >
            <option value="ALL">All Departments</option>
            <option value="Engineering & Construction">Engineering & Construction</option>
            <option value="Project Management">Project Management</option>
            <option value="Executive Operations">Executive Operations</option>
          </select>
        </div>
      </div>

      {/* Muster Table */}
      <div className="mt-5 overflow-x-auto">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Generating workforce muster...</div>
        ) : report.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No muster records found for {month}.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="pb-3 px-3">Employee</th>
                <th className="pb-3 px-3 text-center">Full Days</th>
                <th className="pb-3 px-3 text-center">Half Days</th>
                <th className="pb-3 px-3 text-center">Absent Days</th>
                <th className="pb-3 px-3 text-center">Late Count</th>
                <th className="pb-3 px-3 text-center">Extra Nights</th>
                <th className="pb-3 px-3 text-center">Leaves</th>
                <th className="pb-3 px-3 text-right">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {report.map((r) => (
                <tr key={r.employeeId} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-3 font-sans">
                    <div className="font-bold text-slate-900">{r.employeeName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{r.employeeId} • {r.department}</div>
                  </td>
                  <td className="py-3.5 px-3 text-center text-emerald-700 font-bold">{r.presentFullDays}</td>
                  <td className="py-3.5 px-3 text-center text-amber-700 font-bold">{r.presentHalfDays}</td>
                  <td className="py-3.5 px-3 text-center text-rose-700 font-bold">{r.absentDays}</td>
                  <td className="py-3.5 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full ${r.lateCount >= 4 ? 'bg-rose-100 text-rose-800 font-bold' : 'text-slate-700'}`}>
                      {r.lateCount}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center text-purple-700 font-bold">{r.extraNightCount}</td>
                  <td className="py-3.5 px-3 text-center text-sky-700 font-bold">{r.leaveDays}</td>
                  <td className="py-3.5 px-3 text-right text-slate-900 font-bold text-sm">
                    {r.totalWorkingHours} hrs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
