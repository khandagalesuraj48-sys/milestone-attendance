import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { getOrCreateInstallationKey } from '../../lib/device';
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Cpu,
  Lock,
} from 'lucide-react';

export const DeviceCard: React.FC = () => {
  const [deviceKey, setDeviceKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isBound, setIsBound] = useState<boolean>(false);
  const [boundHardwareSignature, setBoundHardwareSignature] = useState<string | null>(null);

  const fetchDeviceInfo = async () => {
    try {
      setLoading(true);
      const res = await api.getMyDevice();
      if (res.success) {
        setIsBound(res.isBound);
        setBoundHardwareSignature(res.boundHardwareSignature || null);
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const key = getOrCreateInstallationKey();
    setDeviceKey(key);
    fetchDeviceInfo();
  }, []);

  return (
    <div id="device-security-card" className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs text-slate-900">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Hardware Device Binding</h3>
            <p className="text-[11px] text-slate-500 font-medium">1:1 Biometric & Device Signature Security</p>
          </div>
        </div>

        {loading ? (
          <div className="w-20 h-5 bg-slate-100 rounded-full animate-pulse" />
        ) : isBound ? (
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-semibold tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>BOUND ACTIVE</span>
          </div>
        ) : (
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold tracking-wide">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            <span>READY TO BIND</span>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3 text-xs">
        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span>Current Device Signature:</span>
            </span>
            <span className="font-mono text-slate-900 font-bold tracking-tight bg-white px-2 py-0.5 rounded-md border border-slate-200/80">
              {deviceKey || 'Detecting...'}
            </span>
          </div>
          {boundHardwareSignature && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Authorized Hardware Lock:</span>
              </span>
              <span className="font-mono text-slate-700 font-medium truncate max-w-[180px]">
                {boundHardwareSignature}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Security Policy:</span>
            <span className="text-slate-800 font-semibold">Single Device Lock Enforced</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/50 border border-slate-200/60 flex items-start space-x-2.5 text-[11px] text-slate-600 leading-relaxed">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Your account is securely locked to your registered device to prevent unauthorized clock-ins. If you change your handset or need to reset your browser, please contact your Workforce Administrator for instant unbinding.
          </span>
        </div>
      </div>
    </div>
  );
};
