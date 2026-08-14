import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { LeaveRecord } from '../../types';
import { Calendar, Plus, CheckCircle2, Clock, XCircle, AlertTriangle, FileText } from 'lucide-react';

export const LeaveRequestCard: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.getMyLeaves();
      setLeaves(res.leaves || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!startDate || !endDate || !reason.trim()) {
      setFormError('All fields are required.');
      return;
    }

    try {
      setSubmitting(true);
      await api.submitLeave({ leaveType, startDate, endDate, reason: reason.trim() });
      setShowForm(false);
      setReason('');
      setStartDate('');
      setEndDate('');
      fetchLeaves();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="leave-manager-card" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Leave Requests</h3>
          <p className="text-xs text-slate-500 mt-0.5">Submit time-off applications and monitor approval status</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showForm ? 'Cancel Application' : 'Apply for Leave'}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 pb-1">
            <FileText className="w-4 h-4 text-slate-600" />
            <span>New Leave Application</span>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden font-medium"
              >
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="EARNED">Earned Leave</option>
                <option value="UNPAID">Unpaid / LOP</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold text-xs mb-1.5">Reason for Leave</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the reason for your absence..."
              rows={3}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
              required
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition disabled:opacity-50 shadow-xs"
            >
              {submitting ? 'Submitting Application...' : 'Submit Application'}
            </button>
          </div>
        </form>
      )}

      {/* Leave History List */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading leave requests...</div>
        ) : leaves.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
            No leave applications recorded yet.
          </div>
        ) : (
          leaves.map((l) => (
            <div
              key={l.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-slate-900">{l.leaveType} LEAVE</span>
                  <span className="text-xs text-slate-500 font-medium">
                    ({l.totalDays} {l.totalDays === 1 ? 'day' : 'days'})
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  <span className="font-semibold text-slate-800">{l.startDate}</span> to{' '}
                  <span className="font-semibold text-slate-800">{l.endDate}</span>
                  <span className="mx-1.5 text-slate-300">&bull;</span>
                  <span>{l.reason}</span>
                </div>
              </div>

              <div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                    l.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : l.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {l.status === 'APPROVED' && 'Approved'}
                  {l.status === 'REJECTED' && 'Rejected'}
                  {l.status === 'PENDING' && 'Pending Review'}
                  {!['APPROVED', 'REJECTED', 'PENDING'].includes(l.status) && l.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
