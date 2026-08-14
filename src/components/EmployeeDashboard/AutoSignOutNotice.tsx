import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface AutoSignOutNoticeProps {
  notice: { shiftType: string; date: string; message: string } | null;
}

export const AutoSignOutNotice: React.FC<AutoSignOutNoticeProps> = ({ notice }) => {
  if (!notice) return null;

  return (
    <div id="notice-auto-sign-out" className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-xs">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="font-bold text-slate-900 text-sm">Automatic Shift Close Notification</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">
              Shift: {notice.shiftType} ({notice.date})
            </span>
          </div>
          <p className="mt-1 leading-relaxed text-slate-700">{notice.message}</p>
          <div className="mt-2 text-[11px] text-amber-800 font-medium">
            Policy Applied: <strong className="underline">PRESENT_HALF_DAY</strong> (No full-day credit without manual sign-out timestamp).
          </div>
        </div>
      </div>
    </div>
  );
};
