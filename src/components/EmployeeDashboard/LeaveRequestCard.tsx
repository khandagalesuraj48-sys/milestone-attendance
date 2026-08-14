import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { LeaveRecord } from '../../types';
import { Calendar, Plus, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

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
    if (!startDate || !endDate || !reason) {
      setFormError('All fields are required.');
      return;
    }

    try {
      setSubmitting(true);
      await api.submitLeave({ leaveType, startDate, endDate, reason });
      setShowForm(false);
      setReason('');
      fetchLeaves();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="leave-manager-card" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-slate-900">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Leave Management</h3>
          <p className="text-xs text-slate-500">Submit requests and track administrative approval</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showForm ? 'Cancel' : 'Apply Leave'}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
              >
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="EARNED">Earned Leave</option>
                <option value="UNPAID">Unpaid / LOP</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold text-xs mb-1">Reason for Leave</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State reason for absence"
              rows={2}
              className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-hidden"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-2 text-xs">
        {leaves.length === 0 ? (
          <div className="py-6 text-center text-slate-400">No leave records submitted yet.</div>
        ) : (
          leaves.map((l) => (
            <div key={l.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-900">{l.leaveType} LEAVE</span>
                  <span className="text-slate-500">({l.totalDays} {l.totalDays === 1 ? 'day' : 'days'})</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {l.startDate} to {l.endDate} — Reason: {l.reason}
                </div>
              </div>
              <div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    l.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : l.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {l.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
