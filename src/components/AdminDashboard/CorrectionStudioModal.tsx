import React, { useState } from 'react';
import { api } from '../../lib/api';
import { AttendanceRecord, AttendanceStatus } from '../../types';
import { Edit3, AlertTriangle, ShieldCheck, X, Check } from 'lucide-react';

interface CorrectionStudioModalProps {
  record: AttendanceRecord;
  onClose: () => void;
  onSuccess: () => void;
}

export const CorrectionStudioModal: React.FC<CorrectionStudioModalProps> = ({
  record,
  onClose,
  onSuccess,
}) => {
  const [newStatus, setNewStatus] = useState<AttendanceStatus>(record.attendanceStatus);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reason || reason.trim().length < 5) {
      setError('A mandatory administrative reason of at least 5 characters is required.');
      return;
    }

    try {
      setLoading(true);
      const recId = record.recordId || record.id;
      await api.correctAttendance(recId, {
        newAttendanceStatus: newStatus,
        administrativeReason: reason,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit correction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="modal-correction-studio" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 text-slate-900">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-700">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Attendance Correction Studio</h3>
            <p className="text-xs text-slate-500">Creates an immutable audit record in AttendanceCorrections</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Existing Record Snapshot */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Employee:</span>
            <span className="font-semibold text-slate-900">{record.employeeName} ({record.employeeId})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Site Snapshot:</span>
            <span className="font-medium text-slate-900">{record.siteNameSnapshot} • {record.locationNameSnapshot}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Shift / Date:</span>
            <span className="font-mono text-slate-700">{record.shiftType} • {record.businessDate || record.attendanceDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Status:</span>
            <span className="font-mono text-amber-800 font-bold">{record.attendanceStatus}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">New Adjusted Attendance Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium outline-hidden"
            >
              <option value="PRESENT_FULL_DAY">PRESENT_FULL_DAY (Full Working Day)</option>
              <option value="PRESENT_HALF_DAY">PRESENT_HALF_DAY (Half Working Day)</option>
              <option value="ABSENT">ABSENT (Mark Absent)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Mandatory Administrative Reason <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Verified site connectivity issue / approved emergency departure"
              rows={3}
              required
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              This explanation is permanently locked into the company compliance audit ledger.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition disabled:opacity-50 flex items-center space-x-1.5 shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{loading ? 'Committing Correction...' : 'Commit Immutable Correction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
