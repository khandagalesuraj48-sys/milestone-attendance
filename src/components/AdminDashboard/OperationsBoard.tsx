import React, { useState } from 'react';
import { api } from '../../lib/api';
import {
  Users,
  UserCheck,
  Clock,
  LogOut,
  Sun,
  AlertTriangle,
  Moon,
  Sparkles,
  ShieldAlert,
  Play,
  CheckCircle2,
  Building2,
} from 'lucide-react';

interface OperationsBoardProps {
  summary: Record<string, number>;
  todayDate: string;
  onRefresh: () => void;
}

export const OperationsBoard: React.FC<OperationsBoardProps> = ({ summary, todayDate, onRefresh }) => {
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
  const [schedulerOutput, setSchedulerOutput] = useState<string | null>(null);

  const handleRunScheduler = async (type: 'DAY' | 'NIGHT') => {
    try {
      setTriggerLoading(type);
      setSchedulerOutput(null);
      let res;
      if (type === 'DAY') {
        res = await api.triggerSchedulerDay();
      } else {
        res = await api.triggerSchedulerNight();
      }
      setSchedulerOutput(
        `Executed ${res.worker}: ${res.modifiedCount} open session(s) updated to AUTO_SIGNED_OUT (PRESENT_HALF_DAY).`
      );
      onRefresh();
    } catch (err: any) {
      setSchedulerOutput(`Scheduler Error: ${err.message}`);
    } finally {
      setTriggerLoading(null);
    }
  };

  return (
    <div id="admin-operations-board" className="space-y-6">
      {/* Executive Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1.5">{summary.totalStaff || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">{summary.activeEmployees || 0} Active Staff</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Present Today</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1.5">{summary.presentStaff || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">{summary.absentStaff || 0} Absent Staff</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Working Now</span>
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-800 mt-1.5">{summary.workingNow || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">{summary.signedOut || 0} Manually Signed Out</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Late Marks</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-800 mt-1.5">{summary.lateCount || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Rule: After 08:30 / 19:30</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Extra Nights</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-800 mt-1.5">{summary.extraNightCount || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Double Shift Work</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Auto Sign-Outs</span>
            <LogOut className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-800 mt-1.5">{summary.autoSignedOut || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Half Day Applied</div>
        </div>
      </div>

      {/* Cloud Scheduler Simulation Deck */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
                GCP Cloud Scheduler & Shift Cutoff Automation
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                OIDC Authenticated
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Production Cron: Day auto-sign-out at 01:00 AM IST | Night auto-sign-out at 08:00 AM IST
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="btn-trigger-day-scheduler"
              onClick={() => handleRunScheduler('DAY')}
              disabled={!!triggerLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center space-x-2 transition disabled:opacity-50"
            >
              <Sun className="w-4 h-4 text-amber-600" />
              <span>
                {triggerLoading === 'DAY' ? 'Executing 01:00 AM Cutoff...' : 'Trigger 01:00 AM Day Cutoff'}
              </span>
            </button>

            <button
              id="btn-trigger-night-scheduler"
              onClick={() => handleRunScheduler('NIGHT')}
              disabled={!!triggerLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center space-x-2 transition disabled:opacity-50"
            >
              <Moon className="w-4 h-4 text-indigo-600" />
              <span>
                {triggerLoading === 'NIGHT' ? 'Executing 08:00 AM Cutoff...' : 'Trigger 08:00 AM Night Cutoff'}
              </span>
            </button>
          </div>
        </div>

        {schedulerOutput && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{schedulerOutput}</span>
          </div>
        )}
      </div>
    </div>
  );
};
