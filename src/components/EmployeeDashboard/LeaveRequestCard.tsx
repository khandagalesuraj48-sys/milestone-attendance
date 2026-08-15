import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { LeaveRecord, LeaveBalance, AttendanceRegularizationRequest, Holiday } from '../../types';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  Paperclip,
  Upload,
  Layers,
  Sparkles,
  ShieldCheck,
  Eye,
  X,
  Download,
  Info,
  ExternalLink,
} from 'lucide-react';

export const LeaveRequestCard: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'LEAVE' | 'REGULARIZATION'>('LEAVE');
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [regularizations, setRegularizations] = useState<AttendanceRegularizationRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);

  // Leave Form State
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<{
    rawFile: File;
    fileName: string;
    fileType: string;
    fileSize: number;
  } | null>(null);
  const [leaveFormError, setLeaveFormError] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Regularization Form State
  const [showRegForm, setShowRegForm] = useState(false);
  const [regDate, setRegDate] = useState('');
  const [regShiftType, setRegShiftType] = useState<'REGULAR' | 'OVERTIME' | 'NIGHT'>('REGULAR');
  const [regSignIn, setRegSignIn] = useState('09:00');
  const [regSignOut, setRegSignOut] = useState('18:00');
  const [regReason, setRegReason] = useState('');
  const [regFormError, setRegFormError] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);

  // Ledger Modal State
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leavesRes, regRes, balRes, holRes] = await Promise.all([
        api.getMyLeaves(),
        api.getMyRegularizations(),
        api.getMyLeaveBalance(),
        api.getHolidays(new Date().getFullYear()),
      ]);
      setLeaves(leavesRes.leaves || []);
      setRegularizations(regRes.requests || []);
      setBalance(balRes.balance || null);
      setHolidays(holRes.holidays || []);
    } catch (err) {
      console.error('Failed to load leave data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLeaveFormError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    const isValid =
      file.type.startsWith('image/') ||
      validExtensions.includes(ext) ||
      file.type.includes('pdf') ||
      file.type.includes('document') ||
      file.type.includes('sheet');

    if (!isValid) {
      setLeaveFormError('Unsupported file format. Please select a PDF, Word, Excel, or Image document.');
      return;
    }

    setAttachmentFile({
      rawFile: file,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
    });
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveFormError('');
    if (!startDate || !endDate || !reason.trim()) {
      setLeaveFormError('Start date, end date, and reason are required.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setLeaveFormError('Start date cannot be after end date.');
      return;
    }

    try {
      setSubmittingLeave(true);

      let uploadedMeta: {
        url: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        id: string;
      } | null = null;

      if (attachmentFile?.rawFile) {
        try {
          const uploadRes = await api.uploadFile(attachmentFile.rawFile, 'leave_attachment');
          if (uploadRes.success && uploadRes.file) {
            uploadedMeta = {
              url: uploadRes.file.url,
              fileName: uploadRes.file.fileName,
              fileType: uploadRes.file.fileType,
              fileSize: uploadRes.file.fileSize,
              id: uploadRes.file.id,
            };
          } else {
            throw new Error('Attachment upload failed. Please try again.');
          }
        } catch (uploadErr: any) {
          setLeaveFormError(uploadErr.message || 'Attachment upload failed. Please try again.');
          setSubmittingLeave(false);
          return;
        }
      }

      await api.submitLeave({
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        attachmentUrl: uploadedMeta?.url,
        attachmentName: uploadedMeta?.fileName,
        attachmentType: uploadedMeta?.fileType,
        attachmentSize: uploadedMeta?.fileSize,
        attachmentId: uploadedMeta?.id,
      });

      setShowLeaveForm(false);
      setReason('');
      setStartDate('');
      setEndDate('');
      setAttachmentFile(null);
      await fetchData();
    } catch (err: any) {
      setLeaveFormError(err.message || 'Failed to submit leave application.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegFormError('');
    if (!regDate || !regSignIn || !regSignOut || !regReason.trim()) {
      setRegFormError('All fields are required.');
      return;
    }

    try {
      setSubmittingReg(true);
      await api.requestRegularization({
        attendanceDate: regDate,
        shiftType: regShiftType,
        requestedSignInTime: regSignIn,
        requestedSignOutTime: regSignOut,
        reason: regReason.trim(),
      });
      setShowRegForm(false);
      setRegReason('');
      setRegDate('');
      await fetchData();
    } catch (err: any) {
      setRegFormError(err.message || 'Failed to submit regularization request.');
    } finally {
      setSubmittingReg(false);
    }
  };

  // Check overlapping holidays for leave range
  const overlappingHolidays = holidays.filter((h) => {
    if (!startDate || !endDate) return false;
    return h.date >= startDate && h.date <= endDate;
  });

  return (
    <div id="leave-manager-module" className="space-y-4">
      {/* 1. Transparent Paid Leave Balance Card */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>Paid Leave Entitlement Ledger</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-white">
                {balance ? (balance.currentBalance ?? balance.paidRemaining ?? 0) : '--'}
              </span>
              <span className="text-sm font-semibold text-slate-300">Days Available</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Accrues <strong className="text-white">+2 paid days</strong> on the 1st of every month &bull; Perpetual carry-forward
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLedgerModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700 flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>View Ledger History</span>
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Used Paid Leaves</span>
            <span className="text-sm font-bold text-white font-mono">
              {balance ? (balance.usedLeaves ?? balance.paidUsed ?? 0) : 0} days
            </span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Unpaid Leaves</span>
            <span className="text-sm font-bold text-amber-300 font-mono">
              {balance ? (balance.unpaidLeaves ?? balance.approvedUnpaid ?? 0) : 0} days
            </span>
          </div>
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 block font-medium">Sunday & Holidays</span>
            <span className="text-[11px] font-semibold text-emerald-400">Exempt from deductions</span>
          </div>
        </div>
      </div>

      {/* 2. Main Action Card with Tabs */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs text-slate-900">
        {/* Navigation Sub-Tabs */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 gap-2 flex-wrap">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('LEAVE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'LEAVE'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Leave Applications ({leaves.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('REGULARIZATION')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'REGULARIZATION'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Attendance Regularization ({regularizations.length})
            </button>
          </div>

          <div>
            {activeSubTab === 'LEAVE' ? (
              <button
                type="button"
                onClick={() => setShowLeaveForm(!showLeaveForm)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>{showLeaveForm ? 'Cancel Application' : 'Apply for Leave'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowRegForm(!showRegForm)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>{showRegForm ? 'Cancel Request' : 'Request Regularization'}</span>
              </button>
            )}
          </div>
        </div>

        {/* -------------------- LEAVE TAB CONTENT -------------------- */}
        {activeSubTab === 'LEAVE' && (
          <div className="mt-4 space-y-4">
            {/* Leave Application Form */}
            {showLeaveForm && (
              <form
                onSubmit={handleLeaveSubmit}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs"
              >
                <div className="flex items-center space-x-2 font-bold text-slate-900 pb-1">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <span>New Time-Off Application</span>
                </div>

                {leaveFormError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{leaveFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Leave Type</label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden"
                    >
                      <option value="CASUAL">Casual Leave</option>
                      <option value="SICK">Sick Leave</option>
                      <option value="EARNED">Earned / Paid Leave</option>
                      <option value="UNPAID">Unpaid Leave / LOP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden"
                      required
                    />
                  </div>
                </div>

                {/* Overlapping Holidays Notice */}
                {overlappingHolidays.length > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Company Holiday in Range:</span>
                      <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                        {overlappingHolidays.map((h) => (
                          <li key={h.id}>
                            <strong>{h.date}:</strong> {h.name} (Exempt from paid leave deduction)
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reason for Absence</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide clear reason for time-off..."
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 outline-hidden"
                    required
                  />
                </div>

                {/* File Attachment Section */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Supporting Evidence Attachment (Optional)
                  </label>
                  <div className="p-3 bg-white border border-dashed border-slate-300 rounded-2xl">
                    {attachmentFile ? (
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex items-center space-x-2 truncate">
                          <Paperclip className="w-4 h-4 text-slate-600 shrink-0" />
                          <span className="font-bold text-slate-900 truncate">{attachmentFile.fileName}</span>
                          <span className="text-[10px] text-slate-400">
                            (
                            {attachmentFile.fileSize >= 1024 * 1024
                              ? `${(attachmentFile.fileSize / (1024 * 1024)).toFixed(1)} MB`
                              : `${(attachmentFile.fileSize / 1024).toFixed(1)} KB`}
                            )
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachmentFile(null)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center space-x-2 py-3 cursor-pointer text-slate-600 hover:text-slate-900 transition">
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold">Upload Doctor's Note / Supporting Document (PDF, JPG, PNG, DOCX)</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center space-x-1">
                    <Info className="w-3 h-3 text-slate-400" />
                    <span>The attachment is supporting evidence only. It must NOT automatically approve the leave.</span>
                  </p>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowLeaveForm(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingLeave}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submittingLeave ? 'Submitting Application...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            )}

            {/* Leave Applications History */}
            <div className="space-y-3">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading leave records...</div>
              ) : leaves.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  No leave applications submitted yet.
                </div>
              ) : (
                leaves.map((l) => (
                  <div
                    key={l.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900">{l.leaveType} LEAVE</span>
                        <span className="text-slate-500 font-semibold">
                          ({l.totalDays} {l.totalDays === 1 ? 'day' : 'days'})
                        </span>
                        {l.status === 'APPROVED' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {l.paidDays || 0} Paid &bull; {l.unpaidDays || 0} Unpaid
                          </span>
                        )}
                      </div>

                      <div className="text-slate-600">
                        <span className="font-bold text-slate-800">{l.startDate}</span> to{' '}
                        <span className="font-bold text-slate-800">{l.endDate}</span>
                        <span className="mx-1.5 text-slate-300">&bull;</span>
                        <span className="italic">"{l.reason}"</span>
                      </div>

                      {l.attachmentUrl && (
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() => setPreviewAttachmentUrl(l.attachmentUrl!)}
                            className="text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-1 underline cursor-pointer text-[11px]"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>Attached Supporting Document</span>
                          </button>
                        </div>
                      )}

                      {l.reviewComment && (
                        <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60 mt-1">
                          <strong>Admin Note:</strong> {l.reviewComment}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
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
        )}

        {/* -------------------- REGULARIZATION TAB CONTENT -------------------- */}
        {activeSubTab === 'REGULARIZATION' && (
          <div className="mt-4 space-y-4">
            {showRegForm && (
              <form
                onSubmit={handleRegSubmit}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs"
              >
                <div className="flex items-center space-x-2 font-bold text-slate-900 pb-1">
                  <Clock className="w-4 h-4 text-slate-700" />
                  <span>Request Attendance Regularization</span>
                </div>

                {regFormError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{regFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Target Date</label>
                    <input
                      type="date"
                      value={regDate}
                      onChange={(e) => setRegDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Shift Type</label>
                    <select
                      value={regShiftType}
                      onChange={(e) => setRegShiftType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden"
                    >
                      <option value="REGULAR">Regular Shift</option>
                      <option value="OVERTIME">Overtime</option>
                      <option value="NIGHT">Night Shift</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Sign-In Time</label>
                    <input
                      type="time"
                      value={regSignIn}
                      onChange={(e) => setRegSignIn(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Sign-Out Time</label>
                    <input
                      type="time"
                      value={regSignOut}
                      onChange={(e) => setRegSignOut(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Reason for Regularization</label>
                  <textarea
                    value={regReason}
                    onChange={(e) => setRegReason(e.target.value)}
                    placeholder="e.g. Device battery ran out / Onsite field assignment / Biometric gate glitch..."
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 outline-hidden"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowRegForm(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReg}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submittingReg ? 'Submitting Request...' : 'Submit Regularization'}
                  </button>
                </div>
              </form>
            )}

            {/* Regularizations History */}
            <div className="space-y-3">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading regularization records...</div>
              ) : regularizations.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  No attendance regularization requests recorded.
                </div>
              ) : (
                regularizations.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900">Attendance Correction</span>
                        <span className="font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {r.attendanceDate}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-900">
                          {r.shiftType} SHIFT
                        </span>
                      </div>

                      <div className="text-slate-600">
                        Requested Hours:{' '}
                        <span className="font-mono font-bold text-slate-900">
                          {r.requestedSignInTime} - {r.requestedSignOutTime}
                        </span>
                        <span className="mx-1.5 text-slate-300">&bull;</span>
                        <span className="italic">"{r.reason}"</span>
                      </div>

                      {r.reviewComment && (
                        <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60 mt-1">
                          <strong>Admin Note:</strong> {r.reviewComment}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : r.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {r.status === 'APPROVED' && 'Approved'}
                        {r.status === 'REJECTED' && 'Rejected'}
                        {r.status === 'PENDING' && 'Pending Review'}
                        {!['APPROVED', 'REJECTED', 'PENDING'].includes(r.status) && r.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Leave Balance Ledger History Modal */}
      {showLedgerModal && balance && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">My Leave Entitlement Ledger</h3>
                <p className="text-xs text-slate-500">
                  Current Balance: <strong className="text-emerald-700 font-mono">{balance.currentBalance} days</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLedgerModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {(!balance.ledger || balance.ledger.length === 0) ? (
                <div className="py-8 text-center text-slate-400">No ledger transactions recorded yet.</div>
              ) : (
                balance.ledger.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            entry.entryType === 'MONTHLY_ACCRUAL'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {entry.entryType}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">{entry.date}</span>
                      </div>
                      <p className="text-slate-700 mt-1 font-medium">{entry.description}</p>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <div
                        className={`text-sm font-extrabold ${
                          entry.changeAmount > 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {entry.changeAmount > 0 ? `+${entry.changeAmount}` : entry.changeAmount} days
                      </div>
                      <div className="text-[10px] text-slate-400">Balance: {entry.balanceAfter}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLedgerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Attachment Preview Modal */}
      {previewAttachmentUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Supporting Evidence Document</h3>
              <button
                type="button"
                onClick={() => setPreviewAttachmentUrl(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 rounded-2xl p-4">
              {previewAttachmentUrl.startsWith('data:image') || previewAttachmentUrl.match(/\.(jpeg|jpg|png|gif|webp)/i) ? (
                <img
                  src={previewAttachmentUrl}
                  alt="Supporting Evidence"
                  className="max-h-[65vh] object-contain rounded-xl shadow-xs"
                />
              ) : (
                <iframe
                  src={previewAttachmentUrl}
                  title="Document Preview"
                  className="w-full h-[60vh] rounded-xl border border-slate-200"
                />
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <a
                href={previewAttachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-4 py-2 bg-slate-100 text-slate-800 font-bold rounded-xl text-xs hover:bg-slate-200 transition inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open / Download File</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewAttachmentUrl(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
