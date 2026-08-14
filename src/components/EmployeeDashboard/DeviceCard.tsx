import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { getOrCreateInstallationKey } from '../../lib/device';
import { Smartphone, ShieldCheck, RefreshCw, CheckCircle, Info } from 'lucide-react';

export const DeviceCard: React.FC = () => {
  const [deviceKey, setDeviceKey] = useState<string>('');

  useEffect(() => {
    const key = getOrCreateInstallationKey();
    setDeviceKey(key);
  }, []);

  return (
    <div id="device-security-card" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-slate-900">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">1:1 Device Security Binding</h3>
            <p className="text-xs text-slate-500">Registered Hardware Installation Signature</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>BOUND ACTIVE</span>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-xs">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Installation Signature:</span>
            <span className="font-mono text-slate-900 font-semibold">{deviceKey}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Device Policy:</span>
            <span className="text-slate-900 font-medium">Single Authorized Device Lock</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Browser Environment:</span>
            <span className="text-slate-700 truncate max-w-[200px] sm:max-w-xs">{navigator.userAgent}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            Your employee account is locked to this browser installation. If you change phones or clear storage, an
            Administrator must perform a Device Reset before you can log in on a new device.
          </span>
        </div>
      </div>
    </div>
  );
};
