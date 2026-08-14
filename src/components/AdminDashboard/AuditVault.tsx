import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { AuditLog } from '../../types';
import { Shield, RefreshCw, FileText, Search, UserCheck } from 'lucide-react';

export const AuditVault: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs();
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) =>
    filterAction === 'ALL' ? true : l.action === filterAction
  );

  return (
    <div id="audit-vault" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-700">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Immutable Compliance Audit Vault</h3>
            <p className="text-xs text-slate-500">Tamper-evident system transaction, Multi-Site and governance ledger</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="p-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs outline-hidden"
          >
            <option value="ALL">All Event Actions</option>
            <option value="ATTENDANCE_SIGN_IN">Sign In Events</option>
            <option value="ATTENDANCE_SIGN_OUT">Sign Out Events</option>
            <option value="ADMIN_ATTENDANCE_CORRECTION">Corrections</option>
            <option value="DEVICE_REGISTERED">Device Bindings</option>
            <option value="DEVICE_RESET">Device Resets</option>
            <option value="EMPLOYEE_CREATED">Employee Onboardings</option>
            <option value="SITE_CREATED">Site Created</option>
            <option value="LOCATION_CREATED">Location Created</option>
            <option value="AUTO_SIGN_OUT_JOB">Scheduler Cutoffs</option>
          </select>

          <button
            onClick={fetchLogs}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center space-x-1 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading compliance audit ledger...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No logs found matching action filter.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="pb-3 px-3">Timestamp (IST)</th>
                <th className="pb-3 px-3">Action / Event</th>
                <th className="pb-3 px-3">Actor</th>
                <th className="pb-3 px-3">Target Entity & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-3 text-slate-500">
                    {new Date(log.timestamp).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-900 font-semibold border border-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-700">
                    {log.actorId} ({log.actorRole})
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 max-w-md truncate">
                    {log.targetEntity}: {JSON.stringify(log.details)}
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
