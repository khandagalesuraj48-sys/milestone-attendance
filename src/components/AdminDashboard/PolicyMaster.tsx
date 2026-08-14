import React from 'react';
import { Sun, Moon, Clock, ShieldCheck, Sparkles, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const PolicyMaster: React.FC = () => {
  return (
    <div id="policy-master" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900 space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Milestone V1 Multi-Site Policy Master</h3>
        <p className="text-xs text-slate-500">Authoritative workforce governance, shift state machine parameters, and precedence tables</p>
      </div>

      {/* Shifts Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Day Shift Card */}
        <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
          <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
            <Sun className="w-5 h-5 text-amber-600" />
            <span>DAY SHIFT SPECIFICATIONS</span>
          </div>

          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex justify-between border-b border-amber-200/60 pb-1.5">
              <span className="text-slate-500">Permitted Sign-In Window:</span>
              <span className="font-mono text-slate-900 font-semibold">05:00:00 AM – 08:00:00 PM IST</span>
            </div>
            <div className="flex justify-between border-b border-amber-200/60 pb-1.5">
              <span className="text-slate-500">Standard Scheduled Start:</span>
              <span className="font-mono text-slate-900">08:00:00 AM IST</span>
            </div>
            <div className="flex justify-between border-b border-amber-200/60 pb-1.5">
              <span className="text-slate-500">Late Grace Threshold:</span>
              <span className="font-mono text-rose-700 font-semibold">08:30:00 AM IST</span>
            </div>
            <div className="flex justify-between border-b border-amber-200/60 pb-1.5">
              <span className="text-slate-500">Normal Working Boundary:</span>
              <span className="font-mono text-slate-700">08:00:00 PM IST (Shift End)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cloud Scheduler Auto Sign-Out:</span>
              <span className="font-mono text-amber-900 font-bold">01:00:00 AM IST (Next Day)</span>
            </div>
          </div>
        </div>

        {/* Night Shift Card */}
        <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3">
          <div className="flex items-center space-x-2 text-indigo-800 font-bold text-sm">
            <Moon className="w-5 h-5 text-indigo-600" />
            <span>NIGHT SHIFT SPECIFICATIONS</span>
          </div>

          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex justify-between border-b border-indigo-200/60 pb-1.5">
              <span className="text-slate-500">Permitted Sign-In Window:</span>
              <span className="font-mono text-slate-900 font-semibold">07:00:00 PM – 08:00:00 AM IST (Next Day)</span>
            </div>
            <div className="flex justify-between border-b border-indigo-200/60 pb-1.5">
              <span className="text-slate-500">Standard Scheduled Start:</span>
              <span className="font-mono text-slate-900">07:00:00 PM IST</span>
            </div>
            <div className="flex justify-between border-b border-indigo-200/60 pb-1.5">
              <span className="text-slate-500">Late Grace Threshold:</span>
              <span className="font-mono text-rose-700 font-semibold">07:30:00 PM (19:30:00) IST</span>
            </div>
            <div className="flex justify-between border-b border-indigo-200/60 pb-1.5">
              <span className="text-slate-500">Normal Working Boundary:</span>
              <span className="font-mono text-slate-700">08:00:00 AM IST (Next Day)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cloud Scheduler Auto Sign-Out:</span>
              <span className="font-mono text-indigo-900 font-bold">08:00:00 AM IST (Same Morning)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Authoritative Working-Hour Calculation Table */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-slate-900">
          <FileText className="w-4 h-4 text-slate-700" />
          <span>AUTHORITATIVE WORKING-HOUR CALCULATION PRECEDENCE TABLE</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-100">
                <th className="py-3 px-3">Actual Working Duration</th>
                <th className="py-3 px-3">Condition / Precedence</th>
                <th className="py-3 px-3">Final Resolved Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-slate-700">
              <tr>
                <td className="py-3 px-3 font-mono font-bold text-emerald-800">&ge; 9 hours (540 min)</td>
                <td className="py-3 px-3">On Time OR Late #1–#3</td>
                <td className="py-3 px-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">PRESENT_FULL_DAY</span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono font-bold text-amber-800">&ge; 4 and &lt; 9 hours</td>
                <td className="py-3 px-3">On Time OR Late #1–#3</td>
                <td className="py-3 px-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">PRESENT_HALF_DAY</span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono font-bold text-rose-800">&lt; 4 hours (240 min)</td>
                <td className="py-3 px-3">Any Condition</td>
                <td className="py-3 px-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">ABSENT</span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono">Any duration</td>
                <td className="py-3 px-3 font-semibold text-rose-800">Late Mark #4 or higher in calendar month</td>
                <td className="py-3 px-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">PRESENT_HALF_DAY</span>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-mono">Any duration</td>
                <td className="py-3 px-3 font-semibold text-amber-800">AUTO_SIGNED_OUT by Cloud Scheduler</td>
                <td className="py-3 px-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">PRESENT_HALF_DAY</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Business Invariant Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-1">
          <div className="font-bold text-purple-900 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Extra Night Invariant</span>
          </div>
          <p className="text-[11px] text-purple-800">
            Attendance classification attribute only. Strictly no monetary compensation, overtime wage, or night stipend generated.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-1">
          <div className="font-bold text-emerald-900 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Single Active Session</span>
          </div>
          <p className="text-[11px] text-emerald-800">
            One active session per employee at any given time. Prior session must be manually or auto-closed before next punch.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200 space-y-1">
          <div className="font-bold text-sky-900 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>Strict Monthly Reset</span>
          </div>
          <p className="text-[11px] text-sky-800">
            Late counters and grace thresholds are strictly bounded by calendar month (01st to last day of month IST).
          </p>
        </div>
      </div>
    </div>
  );
};
