import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { ShieldAlert, AlertTriangle, Smartphone, MapPin, RefreshCw } from 'lucide-react';

export const SecurityCenter: React.FC = () => {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const res = await api.getSecurityEvents();
      setExceptions(res.events || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  return (
    <div id="security-center" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
      <div className="flex items-center justify-between pb-5 border-b border-slate-200">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Security Incident & Breach Radar</h3>
            <p className="text-xs text-slate-500">Real-time geofence breaches, accuracy rejections, and hardware device conflicts</p>
          </div>
        </div>

        <button
          onClick={fetchExceptions}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center space-x-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="mt-5 space-y-3 text-xs">
        {exceptions.length === 0 ? (
          <div className="py-8 text-center text-slate-400">No security exceptions or breaches recorded. System operating securely.</div>
        ) : (
          exceptions.map((ex) => (
            <div
              key={ex.id}
              className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 flex items-start space-x-3"
            >
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900">{ex.type}</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(ex.timestamp).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })} IST
                  </span>
                </div>
                <div className="text-slate-800 mt-1 font-medium">{ex.reason}</div>
                <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                  <span>User: {ex.username || ex.employeeId || 'Unknown'}</span>
                  <span>IP: {ex.ipAddress}</span>
                  {ex.details?.distanceMeters && <span>Distance: {Math.round(ex.details.distanceMeters)}m</span>}
                  {ex.details?.accuracy && <span>GPS Accuracy: ±{Math.round(ex.details.accuracy)}m</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
