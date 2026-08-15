import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { LeaveRecord, LeaveBalance, AttendanceRegularizationRequest } from '../../types';
import { SupportingEvidenceModal } from '../common/SupportingEvidenceModal';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Paperclip,
  Eye,
  RefreshCw,
  User,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Download,
  AlertCircle,
  TrendingDown,
  Info,
} from 'lucide-react';

export const LeaveReviewCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'LEAVES' | 'REGULARIZATION' | 'BALANCES'>('LEAVES');
  const [loading, setLoading] = useState(false);

  // Leave State
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Regularization State
  const [regularizations, setRegularizations] = useState<AttendanceRegularizationRequest[]>([]);
  const [regStatusFilter, setRegStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Balances State
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [balanceSearch, setBalanceSearch] = useState('');
  const [selectedLedgerEmp, setSelectedLedgerEmp] = useState<LeaveBalance | null>(null);

  // Review Modal State
  const [reviewingItem, setReviewingItem] = useState<{
    type: 'LEAVE' | 'REGULARIZATION';
    item: any;
  } | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);
  const [previewAttachmentName, setPreviewAttachmentName] = useState<string | undefined>(undefined);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [leavesRes, regRes, balRes] = await Promise.all([
        api.getAllLeaves(),
        api.getAdminRegularizations(),
        api.getAdminLeaveBalances(),
      ]);
      setLeaves(leavesRes.leaves || []);
      setRegularizations(regRes.requests || []);
      setBalances(balRes.balances || []);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to load leave records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleOpenReview = (type: 'LEAVE' | 'REGULARIZATION', item: any) => {
    setReviewingItem({ type, item });
    setReviewStatus('APPROVED');
    setReviewComment('');
  };

  const handleExecuteReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingItem) return;

    try {
      setSubmittingReview(true);
      if (reviewingItem.type === 'LEAVE') {
        await api.reviewLeave(reviewingItem.item.id, reviewStatus, reviewComment.trim());
        const empName = reviewingItem.item.employeeName || reviewingItem.item.employeeId;
        setToastMessage({
          type: 'success',
          text: `Leave application for ${empName} has been ${reviewStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED'} successfully.`,
        });
      } else {
        await api.reviewRegularization(reviewingItem.item.id, reviewStatus, reviewComment.trim());
        const empName = reviewingItem.item.employeeName || reviewingItem.item.employeeId;
        setToastMessage({
          type: 'success',
          text: `Attendance regularization for ${empName} has been ${reviewStatus === 'APPROVED' ? 'APPROVED' : 'REJECTED'} successfully.`,
        });
      }

      // CRITICAL: Close the review modal immediately upon confirmed success
      setReviewingItem(null);
      setReviewComment('');

      // Refresh authoritative data
      await fetchAllData();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to process review decision.' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredLeaves = leaves.filter((l) => {
    if (leaveStatusFilter === 'ALL') return true;
    return l.status === leaveStatusFilter;
  });

  const filteredRegs = regularizations.filter((r) => {
    if (regStatusFilter === 'ALL') return true;
    return r.status === regStatusFilter;
  });

  const filteredBalances = balances.filter((b) => {
    const q = balanceSearch.toLowerCase();
    return (
      b.employeeName?.toLowerCase().includes(q) ||
      b.employeeId?.toLowerCase().includes(q) ||
      b.department?.toLowerCase().includes(q)
    );
  });

  const pendingLeavesCount = leaves.filter((l) => l.status === 'PENDING').length;
  const pendingRegsCount = regularizations.filter((r) => r.status === 'PENDING').length;

  // Compute balance breakdown for currently reviewed leave applicant
  const activeApplicantBalance: LeaveBalance | undefined =
    reviewingItem && reviewingItem.type === 'LEAVE'
      ? balances.find((b) => b.employeeId === reviewingItem.item.employeeId)
      : undefined;

  const currentAvailableBalance = activeApplicantBalance ? (activeApplicantBalance.currentBalance ?? activeApplicantBalance.paidRemaining ?? 0) : 0;
  const requestedDays = reviewingItem && reviewingItem.type === 'LEAVE' ? (reviewingItem.item.totalDays || 1) : 0;
  const eligiblePaidDays = Math.min(currentAvailableBalance, requestedDays);
  const eligibleUnpaidDays = Math.max(0, requestedDays - currentAvailableBalance);
  const balanceAfterApproval = Math.max(0, currentAvailableBalance - requestedDays);

  return (
    <div id="leave-review-center-module" className="space-y-6">
      {/* Header Context */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-slate-900 text-amber-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Leave & Regularization Command Center
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review workforce time-off applications, attendance regularizations, and manage +2/mo leave ledger balances
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAllData}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs flex items-center space-x-2 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center space-x-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center space-x-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xs text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('LEAVES')}
          className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 transition cursor-pointer ${
            activeTab === 'LEAVES'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Leave Applications</span>
          {pendingLeavesCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold">
              {pendingLeavesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REGULARIZATION')}
          className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 transition cursor-pointer ${
            activeTab === 'REGULARIZATION'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Attendance Regularizations</span>
          {pendingRegsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold">
              {pendingRegsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BALANCES')}
          className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 transition cursor-pointer ${
            activeTab === 'BALANCES'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Workforce Leave Balances & Ledger</span>
        </button>
      </div>

      {/* TAB 1: LEAVE APPLICATIONS */}
      {activeTab === 'LEAVES' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Workforce Leave Requests</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rule: Unused leave carries forward. Insufficient balance converts to approved unpaid leave.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={leaveStatusFilter}
                onChange={(e) => setLeaveStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 outline-hidden"
              >
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved Requests</option>
                <option value="REJECTED">Rejected Requests</option>
                <option value="ALL">All Statuses</option>
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-3.5">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading leave requests...</div>
            ) : filteredLeaves.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                No leave requests found matching status filter ({leaveStatusFilter}).
              </div>
            ) : (
              filteredLeaves.map((leave) => {
                const empBal = balances.find((b) => b.employeeId === leave.employeeId);
                const hasAttachment = !!leave.attachmentUrl;

                return (
                  <div
                    key={leave.id}
                    className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          {leave.employeeName || leave.employeeId}
                        </span>
                        <span className="font-mono text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {leave.employeeId}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-white">
                          {leave.leaveType} LEAVE
                        </span>
                        <span className="text-xs text-slate-600 font-semibold">
                          ({leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'})
                        </span>
                      </div>

                      <div className="text-xs text-slate-700">
                        <span className="font-bold text-slate-900">{leave.startDate}</span> to{' '}
                        <span className="font-bold text-slate-900">{leave.endDate}</span>
                        <span className="mx-2 text-slate-300">&bull;</span>
                        <span className="text-slate-600 italic">"{leave.reason}"</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                        <span className="text-slate-600">
                          Applicant Balance:{' '}
                          <strong className="text-emerald-700 font-mono">
                            {empBal ? (empBal.currentBalance ?? empBal.paidRemaining ?? 0) : '--'} paid days
                          </strong>
                        </span>

                        {leave.status === 'APPROVED' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-200">
                            Approved Breakdown: {leave.paidDays || 0} Paid &bull; {leave.unpaidDays || 0} Unpaid
                          </span>
                        )}

                        {hasAttachment && (
                          <button
                            type="button"
                            onClick={() => setPreviewAttachmentUrl(leave.attachmentUrl!)}
                            className="text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-1 underline cursor-pointer"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>View Supporting Evidence</span>
                          </button>
                        )}
                      </div>

                      {leave.reviewComment && (
                        <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-200/60 mt-1">
                          <strong>Admin Note:</strong> {leave.reviewComment}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      {leave.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenReview('LEAVE', leave)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
                        >
                          Review Application
                        </button>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            leave.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {leave.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE REGULARIZATION */}
      {activeTab === 'REGULARIZATION' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Attendance Regularization Queue</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Workforce requests for attendance corrections due to missed punches, field duty, or auto-signout closures
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={regStatusFilter}
                onChange={(e) => setRegStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 outline-hidden"
              >
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved Regularizations</option>
                <option value="REJECTED">Rejected Regularizations</option>
                <option value="ALL">All Statuses</option>
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-3.5">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading regularization queue...</div>
            ) : filteredRegs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                No attendance regularization requests found matching status ({regStatusFilter}).
              </div>
            ) : (
              filteredRegs.map((reg) => (
                <div
                  key={reg.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {reg.employeeName || reg.employeeId}
                      </span>
                      <span className="font-mono text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {reg.employeeId}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-900 border border-amber-300">
                        {reg.shiftType} SHIFT
                      </span>
                    </div>

                    <div className="text-xs text-slate-700">
                      Target Date: <strong className="text-slate-900">{reg.attendanceDate}</strong> &bull; Requested Times:{' '}
                      <span className="font-mono font-bold text-slate-900">
                        {reg.requestedSignInTime} - {reg.requestedSignOutTime}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 italic bg-white/80 p-2 rounded-xl border border-slate-200/60">
                      "{reg.reason}"
                    </div>

                    {reg.reviewComment && (
                      <div className="text-[11px] text-slate-600 mt-1">
                        <strong>Admin Note:</strong> {reg.reviewComment}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {reg.status === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenReview('REGULARIZATION', reg)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
                      >
                        Review Regularization
                      </button>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          reg.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {reg.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE BALANCES & LEDGER */}
      {activeTab === 'BALANCES' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Workforce Leave Balances & Carry-Forward Ledger</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every member receives +2 paid days monthly. Unused balances carry forward perpetually without expiration.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by staff name or ID..."
                value={balanceSearch}
                onChange={(e) => setBalanceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading leave ledger balances...</div>
            ) : filteredBalances.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                No leave balance records found.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="pb-3 px-3">Employee</th>
                    <th className="pb-3 px-3">Department</th>
                    <th className="pb-3 px-3 text-center">Current Paid Balance</th>
                    <th className="pb-3 px-3 text-center">Approved Paid Leaves</th>
                    <th className="pb-3 px-3 text-center">Unpaid Leaves</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBalances.map((b) => (
                    <tr key={b.employeeId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{b.employeeName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{b.employeeId}</div>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-700">{b.department || 'Operations'}</td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200 font-mono">
                          {b.currentBalance ?? b.paidRemaining ?? 0} days
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono text-slate-800 font-semibold">
                        {b.usedLeaves ?? b.paidUsed ?? 0} days
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono text-amber-800 font-semibold">
                        {b.unpaidLeaves ?? b.approvedUnpaid ?? 0} days
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLedgerEmp(b)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-800 font-bold text-xs transition cursor-pointer"
                        >
                          View Ledger History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingItem && (
        <div id="admin-leave-review-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 selection:bg-slate-900 selection:text-white animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {reviewingItem.type === 'LEAVE' ? 'Review Leave Application' : 'Review Regularization Request'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Authoritative decision engine • Milestone Attendance
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Cancel & Close"
              >
                &times;
              </button>
            </div>

            {/* Applicant & Details Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Applicant Details</span>
                <span className="font-extrabold text-slate-900">
                  {reviewingItem.item.employeeName || reviewingItem.item.employeeId} (
                  <span className="font-mono text-slate-600">{reviewingItem.item.employeeId}</span>)
                </span>
              </div>

              {reviewingItem.type === 'LEAVE' ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Leave Dates & Duration</span>
                    <span className="font-bold text-slate-900">
                      {reviewingItem.item.startDate} to {reviewingItem.item.endDate} (
                      <span className="text-slate-950 font-extrabold">{reviewingItem.item.totalDays} {reviewingItem.item.totalDays === 1 ? 'day' : 'days'}</span>)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Leave Classification</span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-bold text-[11px]">
                      {reviewingItem.item.leaveType} LEAVE
                    </span>
                  </div>
                  {reviewingItem.item.department && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Department</span>
                      <span className="font-bold text-slate-800">{reviewingItem.item.department}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Target Attendance Date</span>
                    <span className="font-bold text-slate-900">{reviewingItem.item.attendanceDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Requested Shift</span>
                    <span className="font-bold text-slate-900">{reviewingItem.item.shiftType} Shift</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Requested Hours</span>
                    <span className="font-mono font-bold text-slate-900">
                      {reviewingItem.item.requestedSignInTime} - {reviewingItem.item.requestedSignOutTime}
                    </span>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 font-semibold block mb-0.5">Reason provided by applicant:</span>
                <p className="text-slate-800 italic bg-white p-2.5 rounded-xl border border-slate-200/70">
                  "{reviewingItem.item.reason}"
                </p>
              </div>

              {reviewingItem.item.attachmentUrl && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                    <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs text-blue-900 font-semibold truncate">
                      {reviewingItem.item.attachmentName || 'Supporting Evidence Attached'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewAttachmentUrl(reviewingItem.item.attachmentUrl);
                      setPreviewAttachmentName(reviewingItem.item.attachmentName);
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shrink-0 shadow-2xs"
                  >
                    View Document
                  </button>
                </div>
              )}
            </div>

            {/* AUTHORITATIVE LEAVE BALANCE COMPUTATION CARD (FOR LEAVE REVIEWS) */}
            {reviewingItem.type === 'LEAVE' && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-1.5 font-extrabold text-slate-900">
                    <Layers className="w-4 h-4 text-slate-700" />
                    <span>Authoritative Leave Balance Calculation</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Employee #{reviewingItem.item.employeeId}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Balance</span>
                    <span className="text-base font-extrabold text-slate-900 font-mono">
                      {currentAvailableBalance.toFixed(1)} <span className="text-xs font-normal">days</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Requested</span>
                    <span className="text-base font-extrabold text-amber-700 font-mono">
                      {requestedDays.toFixed(1)} <span className="text-xs font-normal">days</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">After Approval</span>
                    <span className={`text-base font-extrabold font-mono ${balanceAfterApproval > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {balanceAfterApproval.toFixed(1)} <span className="text-xs font-normal">days</span>
                    </span>
                  </div>
                </div>

                {eligibleUnpaidDays > 0 ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Insufficient Paid Leave Balance:</strong>
                      <div className="mt-0.5 text-amber-800">
                        {eligiblePaidDays.toFixed(1)} days will be covered as Paid Leave &bull;{' '}
                        <strong>{eligibleUnpaidDays.toFixed(1)} days will be converted to Unpaid Leave (LOP)</strong> per company policy.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Sufficient paid balance available. All {requestedDays} days will be approved as Paid Leave.</span>
                  </div>
                )}
              </div>
            )}

            {/* Decision Form */}
            <form onSubmit={handleExecuteReview} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
                  Administrative Decision
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="admin-approve-decision-btn"
                    type="button"
                    onClick={() => setReviewStatus('APPROVED')}
                    className={`py-3 rounded-xl font-bold border transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                      reviewStatus === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Application</span>
                  </button>
                  <button
                    id="admin-reject-decision-btn"
                    type="button"
                    onClick={() => setReviewStatus('REJECTED')}
                    className={`py-3 rounded-xl font-bold border transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                      reviewStatus === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Application</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wide text-[10px]">
                  Administrative Review Comment / Justification
                </label>
                <textarea
                  id="admin-review-comment-input"
                  placeholder="Optional review notes, instructions, or rejection justification..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewingItem(null)}
                  disabled={submittingReview}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="admin-submit-decision-btn"
                  type="submit"
                  disabled={submittingReview}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition disabled:opacity-50 cursor-pointer shadow-xs flex items-center space-x-2"
                >
                  {submittingReview ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Processing Decision...</span>
                    </>
                  ) : (
                    <span>Confirm Decision</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger History Modal */}
      {selectedLedgerEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Leave Balance Ledger — {selectedLedgerEmp.employeeName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Employee ID: {selectedLedgerEmp.employeeId} &bull; Current Balance: {selectedLedgerEmp.currentBalance} days
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLedgerEmp(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {(!selectedLedgerEmp.ledger || selectedLedgerEmp.ledger.length === 0) ? (
                <div className="py-8 text-center text-slate-400">No ledger transactions recorded yet.</div>
              ) : (
                selectedLedgerEmp.ledger.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
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
                onClick={() => setSelectedLedgerEmp(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Supporting Evidence Preview Modal */}
      {previewAttachmentUrl && (
        <SupportingEvidenceModal
          fileUrl={previewAttachmentUrl}
          fileName={previewAttachmentName || 'Supporting_Evidence'}
          onClose={() => {
            setPreviewAttachmentUrl(null);
            setPreviewAttachmentName(undefined);
          }}
        />
      )}
    </div>
  );
};
