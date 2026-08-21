import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Site } from '../../types';
import {
  FileText,
  Download,
  RefreshCw,
  Calendar,
  Building2,
  Filter,
  Layers,
  ChevronRight,
  TrendingUp,
  Clock,
} from 'lucide-react';

export const ReportsCenter: React.FC = () => {
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getFirstDayOfMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonthStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [department, setDepartment] = useState('ALL');
  const [siteId, setSiteId] = useState('ALL');
  const [sites, setSites] = useState<Site[]>([]);
  const [report, setReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await api.getSites();
        if (res.success && res.sites) {
          setSites(res.sites);
        }
      } catch (err) {
        console.error('Error loading sites for report:', err);
      }
    };
    fetchSites();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminReport({
        startDate,
        endDate,
        department: department !== 'ALL' ? department : undefined,
        siteId: siteId !== 'ALL' ? siteId : undefined,
      });
      setReport(res.report || []);
    } catch (err) {
      console.error('Error loading muster report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, department, siteId]);

  const setQuickRange = (range: 'THIS_MONTH' | 'LAST_30_DAYS' | 'PREV_MONTH') => {
    const now = new Date();
    if (range === 'THIS_MONTH') {
      setStartDate(getFirstDayOfMonthStr());
      setEndDate(getTodayStr());
    } else if (range === 'LAST_30_DAYS') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(`${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`);
      setEndDate(getTodayStr());
    } else if (range === 'PREV_MONTH') {
      const prevMonthLastDate = new Date(now.getFullYear(), now.getMonth(), 0);
      const prevMonthFirstDate = new Date(prevMonthLastDate.getFullYear(), prevMonthLastDate.getMonth(), 1);
      setStartDate(`${prevMonthFirstDate.getFullYear()}-${String(prevMonthFirstDate.getMonth() + 1).padStart(2, '0')}-01`);
      setEndDate(`${prevMonthLastDate.getFullYear()}-${String(prevMonthLastDate.getMonth() + 1).padStart(2, '0')}-${String(prevMonthLastDate.getDate()).padStart(2, '0')}`);
    }
  };

  const handleExportCSV = () => {
    if (report.length === 0) return;

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Period Range',
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
      `"${startDate} to ${endDate}"`,
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
    link.setAttribute('download', `Milestone_Workforce_Muster_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="reports-center" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Workforce Muster & Date Range Reports</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
              {startDate} → {endDate}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated attendance totals, late penalties, extra night shifts, and verified work hours
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchReport}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="btn-export-muster-csv"
            onClick={handleExportCSV}
            disabled={report.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Muster CSV</span>
          </button>
        </div>
      </div>

      {/* Quick Presets & Filters */}
      <div className="mt-5 space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-medium mr-1">Quick Range:</span>
            <button
              type="button"
              onClick={() => setQuickRange('THIS_MONTH')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setQuickRange('LAST_30_DAYS')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setQuickRange('PREV_MONTH')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
            >
              Previous Month
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">From Date</label>
            <div className="relative">
              <input
                id="input-report-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">To Date</label>
            <div className="relative">
              <input
                id="input-report-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Project Site Filter</label>
            <select
              id="select-report-site-filter"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
            >
              <option value="ALL">All Project Sites ({sites.length})</option>
              {sites.map((s) => (
                <option key={s.siteId} value={s.siteId}>
                  {s.siteName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">Department Filter</label>
            <select
              id="select-report-dept-filter"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
            >
              <option value="ALL">All Departments</option>
              <option value="Engineering & Construction">Engineering & Construction</option>
              <option value="Project Management">Project Management</option>
              <option value="Executive Operations">Executive Operations</option>
              <option value="Finance & Accounts">Finance & Accounts</option>
              <option value="Quality & Safety">Quality & Safety</option>
            </select>
          </div>
        </div>
      </div>

      {/* Muster Table */}
      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-medium">Generating workforce muster...</div>
        ) : report.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 font-medium">
            No muster records found for the selected range ({startDate} to {endDate}).
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3 px-3">Employee</th>
                <th className="pb-3 px-3 text-center">Full Days</th>
                <th className="pb-3 px-3 text-center">Half Days</th>
                <th className="pb-3 px-3 text-center">Absent Days</th>
                <th className="pb-3 px-3 text-center">Late Marks</th>
                <th className="pb-3 px-3 text-center">Extra Nights</th>
                <th className="pb-3 px-3 text-center">Leaves</th>
                <th className="pb-3 px-3 text-right">Total Working Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {report.map((r) => (
                <tr key={r.employeeId} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-3 font-sans">
                    <div className="font-bold text-sm text-slate-900">{r.employeeName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {r.employeeId} &bull; {r.department}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center text-emerald-700 font-bold">{r.presentFullDays}</td>
                  <td className="py-3.5 px-3 text-center text-amber-700 font-bold">{r.presentHalfDays}</td>
                  <td className="py-3.5 px-3 text-center text-rose-700 font-bold">{r.absentDays}</td>
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        r.lateCount >= 4
                          ? 'bg-rose-100 text-rose-800'
                          : r.lateCount > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'text-slate-700'
                      }`}
                    >
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
