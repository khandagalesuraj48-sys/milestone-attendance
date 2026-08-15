import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import {
  PayrollRun,
  PayrollItem,
  SalarySlip,
  MasterRegisterSummary,
  MasterRegisterEntry,
  MasterRegisterStatus,
  DayWiseAttendanceEntry,
  Site,
} from '../../types';
import {
  Banknote,
  Calendar,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Eye,
  Lock,
  ChevronDown,
  ArrowUpDown,
  Building2,
  Briefcase,
  X,
  CreditCard,
  Layers,
  Unlock,
  ClipboardCheck,
  Check,
  Clock,
  Sun,
  Moon,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { SalarySlipModal } from '../common/SalarySlipModal';

export const PayrollEngine: React.FC = () => {
  // Current month in YYYY-MM
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${yr}-${mo}`;
  }, []);

  // Mode: Master Register Finalization vs Payroll Runs
  const [engineView, setEngineView] = useState<'REGISTER' | 'PAYROLL'>('REGISTER');

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // ==========================================
  // MASTER REGISTER STATE
  // ==========================================
  const [masterSummary, setMasterSummary] = useState<MasterRegisterSummary | null>(null);
  const [registerSearchQuery, setRegisterSearchQuery] = useState('');
  const [registerDept, setRegisterDept] = useState('ALL');
  const [registerSiteId, setRegisterSiteId] = useState('ALL');

  // Day-wise Attendance Breakdown Inspection Modal
  const [inspectingEntry, setInspectingEntry] = useState<MasterRegisterEntry | null>(null);

  // Admin Override Modal for Register Entry
  const [adjustingEntry, setAdjustingEntry] = useState<MasterRegisterEntry | null>(null);
  const [adjPresentDays, setAdjPresentDays] = useState<number>(0);
  const [adjAbsentDays, setAdjAbsentDays] = useState<number>(0);
  const [adjPayableDays, setAdjPayableDays] = useState<number>(0);
  const [adjNotes, setAdjNotes] = useState<string>('');

  // ==========================================
  // PAYROLL RUN STATE
  // ==========================================
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [currentRun, setCurrentRun] = useState<PayrollRun | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Edit Item Modal (Payroll)
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);
  const [editIncentives, setEditIncentives] = useState<number>(0);
  const [editExtraNight, setEditExtraNight] = useState<number>(0);
  const [editOtherAllowances, setEditOtherAllowances] = useState<number>(0);
  const [editOtherDeductions, setEditOtherDeductions] = useState<number>(0);
  const [editTds, setEditTds] = useState<number>(0);
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'UNPAID' | 'PAID' | 'ON_HOLD'>('UNPAID');

  // View Slip Modal
  const [viewingSlipId, setViewingSlipId] = useState<string | null>(null);

  // Load Sites
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await api.getSites();
        if (res.success) {
          setSites(res.sites || []);
        }
      } catch {}
    };
    fetchSites();
  }, []);

  // Fetch Master Register
  const fetchMasterRegister = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getMasterRegister({
        month: selectedMonth,
      });
      if (res.success) {
        setMasterSummary(res.summary);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load master register.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Payroll Runs
  const fetchPayrollRuns = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getPayrollRuns();
      if (res.success) {
        setRuns(res.runs || []);
        const matched = (res.runs || []).find((r) => r.month === selectedMonth);
        if (matched) {
          const detailRes = await api.getPayrollRun(matched.id);
          if (detailRes.success) {
            setCurrentRun(detailRes.run);
          }
        } else {
          setCurrentRun(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payroll records.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh data whenever selectedMonth or view changes
  useEffect(() => {
    fetchMasterRegister();
    fetchPayrollRuns();
  }, [selectedMonth]);

  // ==========================================
  // MASTER REGISTER ACTIONS
  // ==========================================
  const handleGenerateRegister = async () => {
    setError('');
    setSuccessMsg('');
    try {
      setActionLoading(true);
      const res = await api.generateMasterRegister(selectedMonth);
      if (res.success) {
        setSuccessMsg(res.message);
        setMasterSummary(res.summary);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync master register.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRegisterStatus = async (status: MasterRegisterStatus) => {
    if (!masterSummary) return;
    if (
      status === 'FINALIZED' &&
      !window.confirm(
        `Finalize attendance for ${selectedMonth}? This locks attendance adjustments and establishes the baseline for payroll.`
      )
    ) {
      return;
    }

    setError('');
    setSuccessMsg('');
    try {
      setActionLoading(true);
      const res = await api.updateMasterRegisterStatus(selectedMonth, status);
      if (res.success) {
        setSuccessMsg(res.message);
        setMasterSummary(res.summary);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update register status.');
    } finally {
      setActionLoading(false);
    }
  };

  const openAdjustEntryModal = (entry: MasterRegisterEntry) => {
    setAdjustingEntry(entry);
    setAdjPresentDays(entry.adminFinalPresentDays);
    setAdjAbsentDays(entry.adminFinalAbsentDays);
    setAdjPayableDays(entry.totalPayableDays);
    setAdjNotes(entry.adminNotes || '');
  };

  const handleSaveEntryAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingEntry) return;

    setError('');
    try {
      setActionLoading(true);
      const res = await api.updateMasterRegisterEntry(selectedMonth, adjustingEntry.id, {
        adminFinalPresentDays: Number(adjPresentDays),
        adminFinalAbsentDays: Number(adjAbsentDays),
        totalPayableDays: Number(adjPayableDays),
        adminNotes: adjNotes,
      });

      if (res.success) {
        setAdjustingEntry(null);
        setSuccessMsg(res.message);
        await fetchMasterRegister();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save attendance adjustments.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportRegisterCSV = () => {
    if (!masterSummary || !masterSummary.entries || masterSummary.entries.length === 0) return;

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Designation',
      'Project Site',
      'Joining Date',
      'Month',
      'Total Days in Month',
      'Total Working Days',
      'Actual Present Days',
      'Actual Absent Days',
      'Paid Leaves',
      'Unpaid Leaves',
      'Holidays',
      'Holidays Worked',
      'Weekly Offs',
      'Late Marks',
      'Half Days',
      'Extra Night Shifts',
      'Admin Final Present Days',
      'Admin Final Absent Days',
      'Total Payable Days',
      'Status',
      'Admin Notes',
    ];

    const rows = masterSummary.entries.map((e) => [
      `"${e.employeeId}"`,
      `"${e.employeeName}"`,
      `"${e.department}"`,
      `"${e.designation}"`,
      `"${e.siteName || ''}"`,
      `"${e.joiningDate || ''}"`,
      e.month,
      e.totalDaysInMonth,
      e.totalWorkingDays,
      e.actualPresentDays,
      e.actualAbsentDays,
      e.paidLeaves,
      e.unpaidLeaves,
      e.holidays,
      e.holidaysWorked,
      e.weeklyOffs,
      e.lateMarksCount,
      e.halfDaysCount,
      e.extraNightsCount,
      e.adminFinalPresentDays,
      e.adminFinalAbsentDays,
      e.totalPayableDays,
      e.status,
      `"${e.adminNotes || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Milestone_Master_Register_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Master Register Entries
  const filteredRegisterEntries = useMemo(() => {
    if (!masterSummary || !masterSummary.entries) return [];
    return masterSummary.entries.filter((entry) => {
      const matchesSearch =
        entry.employeeName.toLowerCase().includes(registerSearchQuery.toLowerCase()) ||
        entry.employeeId.toLowerCase().includes(registerSearchQuery.toLowerCase()) ||
        entry.designation.toLowerCase().includes(registerSearchQuery.toLowerCase());
      const matchesDept = registerDept === 'ALL' || entry.department === registerDept;
      const matchesSite = registerSiteId === 'ALL' || entry.siteId === registerSiteId;
      return matchesSearch && matchesDept && matchesSite;
    });
  }, [masterSummary, registerSearchQuery, registerDept, registerSiteId]);

  const registerDepartments = useMemo(() => {
    if (!masterSummary || !masterSummary.entries) return [];
    const depts = new Set<string>();
    masterSummary.entries.forEach((e) => {
      if (e.department) depts.add(e.department);
    });
    return Array.from(depts);
  }, [masterSummary]);

  // ==========================================
  // PAYROLL RUN ACTIONS
  // ==========================================
  const handleGeneratePayroll = async () => {
    setError('');
    setSuccessMsg('');
    try {
      setActionLoading(true);
      const res = await api.generatePayroll(selectedMonth);
      if (res.success) {
        setSuccessMsg(res.message);
        await fetchPayrollRuns();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate payroll.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizePayroll = async () => {
    if (!currentRun) return;
    if (
      !window.confirm(
        `Are you sure you want to finalize payroll for ${currentRun.month}? This will lock compensation adjustments.`
      )
    )
      return;

    setError('');
    setSuccessMsg('');
    try {
      setActionLoading(true);
      const res = await api.finalizePayroll(currentRun.id);
      if (res.success) {
        setSuccessMsg(res.message);
        await fetchPayrollRuns();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to finalize payroll.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishPayroll = async () => {
    if (!currentRun) return;
    if (
      !window.confirm(
        `Are you sure you want to publish salary slips for ${currentRun.month} to all ${currentRun.totalEmployees} employees? They will be able to view & download slips immediately.`
      )
    )
      return;

    setError('');
    setSuccessMsg('');
    try {
      setActionLoading(true);
      const res = await api.publishPayroll(currentRun.id);
      if (res.success) {
        setSuccessMsg(res.message);
        await fetchPayrollRuns();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to publish salary slips.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!currentRun) return;
    if (!window.confirm(`Are you sure you want to discard draft payroll for ${currentRun.month}?`)) return;

    setError('');
    setSuccessMsg('');
    try {
      setActionLoading(true);
      const res = await api.deletePayroll(currentRun.id);
      if (res.success) {
        setSuccessMsg(res.message);
        setCurrentRun(null);
        await fetchPayrollRuns();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete payroll draft.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEditItem = (item: PayrollItem) => {
    setEditingItem(item);
    setEditIncentives(item.incentivesBonus || 0);
    setEditExtraNight(item.extraNightBonus || 0);
    setEditOtherAllowances(item.earnedOtherAllowances || 0);
    setEditOtherDeductions(item.otherDeductions || 0);
    setEditTds(item.tdsDeduction || 0);
    setEditRemarks(item.remarks || '');
    setEditPaymentStatus(item.paymentStatus || 'UNPAID');
  };

  const handleSaveItemAdjustments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRun || !editingItem) return;

    setError('');
    try {
      setActionLoading(true);
      const res = await api.updatePayrollItem(currentRun.id, editingItem.id, {
        incentivesBonus: Number(editIncentives),
        extraNightBonus: Number(editExtraNight),
        otherAllowances: Number(editOtherAllowances),
        otherDeductions: Number(editOtherDeductions),
        tdsDeduction: Number(editTds),
        remarks: editRemarks,
        paymentStatus: editPaymentStatus,
      });

      if (res.success) {
        setEditingItem(null);
        setSuccessMsg(`Salary adjustments updated for ${editingItem.employeeName}.`);
        await fetchPayrollRuns();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update item adjustments.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportBankCSV = () => {
    if (!currentRun || !currentRun.items || currentRun.items.length === 0) return;

    const headers = [
      'Employee ID',
      'Employee Name',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'Gross Earned',
      'Total Deductions',
      'Net Salary Payable',
      'Payment Status',
      'Remarks',
    ];

    const rows = currentRun.items.map((it) => [
      `"${it.employeeId}"`,
      `"${it.employeeName}"`,
      `"${it.bankName || ''}"`,
      `"${it.accountNumber || ''}"`,
      `"${it.ifscCode || ''}"`,
      it.totalGrossEarned,
      it.totalDeductions,
      it.netSalary,
      it.paymentStatus,
      `"Salary for ${it.month}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Milestone_Payroll_Bank_Advice_${currentRun.month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departments = useMemo(() => {
    if (!currentRun || !currentRun.items) return [];
    const depts = new Set<string>();
    currentRun.items.forEach((it) => {
      if (it.department) depts.add(it.department);
    });
    return Array.from(depts);
  }, [currentRun]);

  const filteredItems = useMemo(() => {
    if (!currentRun || !currentRun.items) return [];
    return currentRun.items.filter((it) => {
      const matchesSearch =
        it.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        it.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        it.designation.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = selectedDept === 'ALL' || it.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [currentRun, searchQuery, selectedDept]);

  return (
    <div id="payroll-engine-root" className="space-y-6 text-slate-900">
      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Module Navigation Switcher & Month Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2.5 mb-1">
              <div className="p-2 rounded-xl bg-slate-900 text-amber-400">
                <Banknote className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Attendance Master Register & Payroll Engine
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl">
              Server-authoritative attendance muster finalization, day-wise audit matrices, Indian statutory compensation proration (PF, Maharashtra PT, TDS), and digital salary slip distribution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Month Selector */}
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500 ml-2" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 py-1 px-2 focus:outline-hidden cursor-pointer"
              />
            </div>

            {/* Quick Switcher */}
            <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setEngineView('REGISTER')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer ${
                  engineView === 'REGISTER'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Master Register & Finalization</span>
              </button>
              <button
                type="button"
                onClick={() => setEngineView('PAYROLL')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 cursor-pointer ${
                  engineView === 'PAYROLL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span>2. Payroll Calculation & Slips</span>
              </button>
            </div>
          </div>
        </div>

        {/* =============================================================
            VIEW 1: MASTER REGISTER & ATTENDANCE FINALIZATION
            ============================================================= */}
        {engineView === 'REGISTER' && (
          <div className="mt-6 space-y-6">
            {/* Master Summary Top Cards & Status Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Muster Status
                </span>
                <div className="mt-1 flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${
                      masterSummary?.status === 'FINALIZED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : masterSummary?.status === 'SUBMITTED'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : masterSummary?.status === 'REOPENED'
                        ? 'bg-purple-100 text-purple-800 border border-purple-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {masterSummary?.status || 'DRAFT'}
                  </span>
                  {masterSummary?.status === 'FINALIZED' && (
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Enrolled Workforce
                </span>
                <div className="mt-1 text-base font-bold text-slate-900 flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>{masterSummary?.totalEmployees || 0} Staff Members</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Payable Days
                </span>
                <div className="mt-1 text-base font-bold text-slate-900 font-mono flex items-center space-x-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>{masterSummary?.totalPayableDays?.toFixed(1) || 0} Days</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Workflow Action
                </span>
                <div className="mt-1 flex items-center space-x-2">
                  {masterSummary?.status === 'FINALIZED' ? (
                    <button
                      onClick={() => handleUpdateRegisterStatus('REOPENED')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Reopen Register</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleUpdateRegisterStatus('FINALIZED')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center space-x-1 transition cursor-pointer shadow-xs"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Finalize & Lock</span>
                      </button>
                      <button
                        onClick={() => handleUpdateRegisterStatus('SUBMITTED')}
                        disabled={actionLoading || masterSummary?.status === 'SUBMITTED'}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-amber-400" />
                        <span>Submit</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Bar & Register Search/Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleGenerateRegister}
                  disabled={actionLoading || masterSummary?.status === 'FINALIZED'}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                  title="Re-sync master register from raw punch records & leaves"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${actionLoading ? 'animate-spin' : ''}`} />
                  <span>Sync / Recalculate Muster</span>
                </button>

                <button
                  onClick={handleExportRegisterCSV}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center space-x-1.5 transition border border-slate-200 cursor-pointer"
                  title="Download complete Master Register CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Export Master Register CSV</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search staff, ID, role..."
                    value={registerSearchQuery}
                    onChange={(e) => setRegisterSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <select
                  value={registerDept}
                  onChange={(e) => setRegisterDept(e.target.value)}
                  className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="ALL">All Departments</option>
                  {registerDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                <select
                  value={registerSiteId}
                  onChange={(e) => setRegisterSiteId(e.target.value)}
                  className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="ALL">All Sites</option>
                  {sites.map((s) => (
                    <option key={s.siteId} value={s.siteId}>
                      {s.siteName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Master Register Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="p-3">Staff Profile</th>
                    <th className="p-3">Site & Joining</th>
                    <th className="p-3 text-center">Calendar / Work</th>
                    <th className="p-3 text-center">Actual P / A</th>
                    <th className="p-3 text-center">Leaves & W/O</th>
                    <th className="p-3 text-center">Late / Extra</th>
                    <th className="p-3 text-center bg-slate-100/70 font-black text-slate-900">
                      Admin Final Payable
                    </th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRegisterEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No master register entries found for {selectedMonth}. Click "Sync / Recalculate Muster" to compile attendance.
                      </td>
                    </tr>
                  ) : (
                    filteredRegisterEntries.map((entry) => {
                      const hasAdminAdjust =
                        entry.adminFinalPresentDays !== entry.actualPresentDays ||
                        entry.adminFinalAbsentDays !== entry.actualAbsentDays;

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{entry.employeeName}</div>
                            <div className="font-mono text-[10px] text-slate-500">
                              {entry.employeeId} &bull; {entry.designation}
                            </div>
                            <div className="text-[10px] text-slate-400">{entry.department}</div>
                          </td>

                          <td className="p-3">
                            <div className="font-semibold text-slate-800 text-[11px]">
                              {entry.siteName || 'Milestone Site'}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500">
                              DOJ: {entry.joiningDate || 'N/A'}
                            </div>
                          </td>

                          <td className="p-3 text-center font-mono">
                            <span className="font-bold text-slate-900">{entry.totalDaysInMonth}d</span>
                            <span className="text-[10px] text-slate-400 block">
                              Work: {entry.totalWorkingDays}d
                            </span>
                          </td>

                          <td className="p-3 text-center font-mono">
                            <div className="font-bold text-emerald-700">P: {entry.actualPresentDays}d</div>
                            <div className="text-[10px] text-rose-600 font-semibold">
                              A: {entry.actualAbsentDays}d
                            </div>
                          </td>

                          <td className="p-3 text-center font-mono text-[11px]">
                            <div className="text-slate-700">
                              Paid: <span className="font-bold">{entry.paidLeaves}d</span>
                              {entry.unpaidLeaves > 0 && (
                                <span className="text-rose-600 font-bold ml-1">
                                  (LOP {entry.unpaidLeaves}d)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              WO: {entry.weeklyOffs}d &bull; HL: {entry.holidays}d
                            </div>
                          </td>

                          <td className="p-3 text-center font-mono text-[11px]">
                            {entry.lateMarksCount > 0 && (
                              <span className="text-amber-700 font-bold block">
                                {entry.lateMarksCount} Late
                              </span>
                            )}
                            {entry.extraNightsCount > 0 && (
                              <span className="text-indigo-700 font-bold block">
                                +{entry.extraNightsCount} Extra Night
                              </span>
                            )}
                            {entry.lateMarksCount === 0 && entry.extraNightsCount === 0 && (
                              <span className="text-slate-400">--</span>
                            )}
                          </td>

                          <td className="p-3 text-center bg-slate-100/50 font-mono">
                            <div className="text-base font-black text-slate-950">
                              {entry.totalPayableDays} Days
                            </div>
                            {hasAdminAdjust && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 mt-0.5">
                                Adjusted by Admin
                              </span>
                            )}
                            {entry.adminNotes && (
                              <div className="text-[9px] text-slate-500 truncate max-w-[120px] mx-auto italic mt-0.5">
                                "{entry.adminNotes}"
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => setInspectingEntry(entry)}
                                className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                                title="Inspect Day-Wise Attendance Muster"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                              </button>

                              {masterSummary?.status !== 'FINALIZED' && (
                                <button
                                  onClick={() => openAdjustEntryModal(entry)}
                                  className="p-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
                                  title="Adjust Present/Absent Days & Notes"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =============================================================
            VIEW 2: PAYROLL RUN & PAYSLIP DISTRIBUTION
            ============================================================= */}
        {engineView === 'PAYROLL' && (
          <div className="mt-6 space-y-6">
            {/* Payroll Status Banner & Connection Note */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FileCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Master Register Synchronized:</strong> Payroll is calculated strictly from the finalized Master Register payable days and confidential employee salary masters.
                </span>
              </div>
              <button
                onClick={() => setEngineView('REGISTER')}
                className="text-xs font-bold text-amber-800 hover:underline shrink-0 cursor-pointer"
              >
                View Master Register &rarr;
              </button>
            </div>

            {/* Run Action Buttons & Top Metric Cards */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Monthly Compensation Run</h3>
                <p className="text-xs text-slate-500">
                  {currentRun ? `Run ID: ${currentRun.id}` : `No payroll run initiated for ${selectedMonth}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!currentRun ? (
                  <button
                    onClick={handleGeneratePayroll}
                    disabled={actionLoading || loading}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-2 transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${actionLoading ? 'animate-spin' : ''}`} />
                    <span>Calculate & Generate Draft</span>
                  </button>
                ) : (
                  <>
                    {currentRun.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={handleGeneratePayroll}
                          disabled={actionLoading}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center space-x-1.5 transition border border-slate-200 cursor-pointer"
                          title="Recalculate with Master Register"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                          <span>Recalculate</span>
                        </button>
                        <button
                          onClick={handleFinalizePayroll}
                          disabled={actionLoading}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Finalize Run</span>
                        </button>
                        <button
                          onClick={handleDeleteDraft}
                          disabled={actionLoading}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs transition cursor-pointer"
                          title="Discard Draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {currentRun.status === 'FINALIZED' && (
                      <button
                        onClick={handlePublishPayroll}
                        disabled={actionLoading}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-white" />
                        <span>Publish Slips to Staff</span>
                      </button>
                    )}

                    <button
                      onClick={handleExportBankCSV}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
                      title="Export Bank Transfer CSV (NEFT/RTGS)"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bank Advice CSV</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Current Run Metrics Summary */}
            {currentRun && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status</span>
                  <div className="mt-1 flex items-center space-x-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                        currentRun.status === 'PUBLISHED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : currentRun.status === 'FINALIZED'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {currentRun.status}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Staff</span>
                  <div className="mt-1 text-base font-bold text-slate-900 flex items-center space-x-1">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>{currentRun.totalEmployees}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gross Earned</span>
                  <div className="mt-1 text-base font-bold text-slate-900 font-mono">
                    ₹{currentRun.totalGrossAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Deductions</span>
                  <div className="mt-1 text-base font-bold text-rose-700 font-mono">
                    -₹{currentRun.totalDeductionsAmount.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 text-white col-span-2 border border-slate-800">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Total Net Payout</span>
                  <div className="mt-1 text-lg sm:text-xl font-black font-mono text-emerald-400">
                    ₹{currentRun.totalNetAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}

            {/* Payroll Items Table */}
            {currentRun && currentRun.items && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Workforce Compensation Muster</h4>
                    <p className="text-xs text-slate-500">
                      Showing {filteredItems.length} of {currentRun.items.length} employees
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                    >
                      <option value="ALL">All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="p-3">Employee</th>
                        <th className="p-3">Attendance & Days</th>
                        <th className="p-3 text-right">Fixed Gross</th>
                        <th className="p-3 text-right">Earned Gross</th>
                        <th className="p-3 text-right">Deductions</th>
                        <th className="p-3 text-right">Net Payable</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{item.employeeName}</div>
                            <div className="font-mono text-[10px] text-slate-500">
                              {item.employeeId} &bull; {item.designation}
                            </div>
                          </td>

                          <td className="p-3 font-mono">
                            <div className="text-slate-900 font-semibold">
                              {item.paidDays} / {item.totalDaysInMonth} Paid Days
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center space-x-1.5">
                              <span>P: {item.presentFullDays + item.presentHalfDays * 0.5}d</span>
                              <span>&bull;</span>
                              <span className={item.lopDays > 0 ? 'text-rose-600 font-bold' : ''}>
                                LOP: {item.lopDays}d
                              </span>
                              {item.extraNightShifts > 0 && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-amber-700 font-bold">Night: {item.extraNightShifts}</span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="p-3 text-right font-mono text-slate-600">
                            ₹{item.grossSalary.toLocaleString('en-IN')}
                          </td>

                          <td className="p-3 text-right font-mono font-semibold text-slate-900">
                            ₹{item.totalGrossEarned.toLocaleString('en-IN')}
                            {item.extraNightBonus > 0 && (
                              <div className="text-[10px] text-amber-700 font-sans">
                                +₹{item.extraNightBonus} Night
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-right font-mono text-rose-700">
                            -₹{item.totalDeductions.toLocaleString('en-IN')}
                            <div className="text-[10px] text-slate-400 font-sans">
                              PF: ₹{item.pfDeduction} &bull; PT: ₹{item.ptDeduction}
                            </div>
                          </td>

                          <td className="p-3 text-right font-mono font-bold text-emerald-700 text-sm">
                            ₹{item.netSalary.toLocaleString('en-IN')}
                          </td>

                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.paymentStatus === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.paymentStatus === 'ON_HOLD'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.paymentStatus}
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {currentRun.status !== 'PUBLISHED' && (
                                <button
                                  onClick={() => handleOpenEditItem(item)}
                                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                                  title="Edit Incentives / Deductions"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => setViewingSlipId(item.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                                title="View & Print Salary Slip"
                              >
                                <Eye className="w-3 h-3 text-amber-400" />
                                <span>Slip</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =============================================================
          MODAL A: DAY-WISE ATTENDANCE MUSTER INSPECTION
          ============================================================= */}
      {inspectingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative my-8 space-y-5">
            <button
              onClick={() => setInspectingEntry(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 bg-slate-900 text-white rounded-2xl">
                <Calendar className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Day-Wise Attendance Muster Inspection
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {inspectingEntry.employeeName} ({inspectingEntry.employeeId}) &bull; {inspectingEntry.month}
                </p>
              </div>
            </div>

            {/* Metrics Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Present Days</span>
                <span className="font-mono font-bold text-emerald-700 text-base">
                  {inspectingEntry.actualPresentDays} Days
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Paid Leaves & Holidays</span>
                <span className="font-mono font-bold text-slate-800 text-base">
                  {inspectingEntry.paidLeaves + inspectingEntry.holidays} Days
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Weekly Offs</span>
                <span className="font-mono font-bold text-slate-800 text-base">
                  {inspectingEntry.weeklyOffs} Days
                </span>
              </div>
              <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-800">
                <span className="text-[10px] text-amber-400 uppercase font-bold block">Total Payable</span>
                <span className="font-mono font-bold text-emerald-400 text-base">
                  {inspectingEntry.totalPayableDays} Days
                </span>
              </div>
            </div>

            {/* Day by Day Calendar Grid */}
            <div className="max-h-[420px] overflow-y-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Date & Day</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-center">Shift</th>
                    <th className="p-2.5">Sign In (IST)</th>
                    <th className="p-2.5">Sign Out (IST)</th>
                    <th className="p-2.5 text-right">Duration</th>
                    <th className="p-2.5 text-center">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(inspectingEntry.dayWiseBreakdown || []).map((day) => {
                    const isSunday = day.dayName === 'Sun';
                    const isPresent =
                      day.status === 'PRESENT_FULL_DAY' ||
                      day.status === 'PRESENT' ||
                      day.status === 'HOLIDAY_WORKED';

                    return (
                      <tr
                        key={day.date}
                        className={`hover:bg-slate-50/80 transition ${
                          isSunday ? 'bg-slate-50/50' : ''
                        }`}
                      >
                        <td className="p-2.5 font-bold text-slate-900">
                          {day.date} ({day.dayName})
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isPresent
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : day.status === 'PRESENT_HALF_DAY'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : day.status === 'WEEKLY_OFF'
                                ? 'bg-slate-100 text-slate-600'
                                : day.status === 'HOLIDAY'
                                ? 'bg-purple-100 text-purple-800'
                                : day.status === 'LEAVE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {day.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-center text-slate-600">
                          {day.shiftType || (isSunday ? 'OFF' : '--')}
                        </td>
                        <td className="p-2.5 text-slate-800">
                          {day.signInTime
                            ? new Date(day.signInTime).toLocaleTimeString('en-US', {
                                timeZone: 'Asia/Kolkata',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : '--'}
                        </td>
                        <td className="p-2.5 text-slate-800">
                          {day.signOutTime
                            ? new Date(day.signOutTime).toLocaleTimeString('en-US', {
                                timeZone: 'Asia/Kolkata',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : '--'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-800">
                          {day.workingMinutes ? `${(day.workingMinutes / 60).toFixed(1)}h` : '--'}
                        </td>
                        <td className="p-2.5 text-center text-[10px] space-x-1">
                          {day.isLate && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                              Late
                            </span>
                          )}
                          {day.isExtraShift && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                              Night Shift
                            </span>
                          )}
                          {day.isRegularized && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                              Reg
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectingEntry(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold cursor-pointer"
              >
                Close Muster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL B: ADMIN ATTENDANCE OVERRIDE & ADJUSTMENT
          ============================================================= */}
      {adjustingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative space-y-4">
            <button
              onClick={() => setAdjustingEntry(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 bg-slate-900 text-white rounded-2xl">
                <Edit2 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Adjust Attendance & Payable Days
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {adjustingEntry.employeeName} ({adjustingEntry.employeeId})
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEntryAdjustment} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Final Present Days</label>
                  <input
                    type="number"
                    step="0.5"
                    value={adjPresentDays}
                    onChange={(e) => {
                      const p = parseFloat(e.target.value) || 0;
                      setAdjPresentDays(p);
                      // Auto-update payable days estimate
                      const pay =
                        p +
                        adjustingEntry.paidLeaves +
                        adjustingEntry.holidays +
                        adjustingEntry.weeklyOffs -
                        Math.floor(adjustingEntry.lateMarksCount / 3) * 0.5;
                      setAdjPayableDays(
                        Math.min(adjustingEntry.totalDaysInMonth, Math.max(0, Number(pay.toFixed(1))))
                      );
                    }}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Final Absent Days</label>
                  <input
                    type="number"
                    step="0.5"
                    value={adjAbsentDays}
                    onChange={(e) => setAdjAbsentDays(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Total Final Payable Days <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={adjPayableDays}
                  onChange={(e) => setAdjPayableDays(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full p-2.5 bg-amber-50 border border-amber-300 rounded-xl font-mono font-bold text-slate-900 text-sm focus:bg-white focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Out of {adjustingEntry.totalDaysInMonth} total days in {selectedMonth}.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Admin Audit Note / Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder="e.g. Regularized missing biometric punch on site inspection"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingEntry(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Adjustments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL C: EDIT PAYROLL ITEM ADJUSTMENTS
          ============================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-slate-900 text-white rounded-2xl">
                <CreditCard className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Payroll Item Adjustments</h3>
                <span className="font-mono text-xs text-slate-500">
                  {editingItem.employeeName} ({editingItem.employeeId}) &bull; {editingItem.month}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveItemAdjustments} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Incentives / Performance Bonus (₹)</label>
                  <input
                    type="number"
                    value={editIncentives}
                    onChange={(e) => setEditIncentives(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Extra Night Shift Allowance (₹)</label>
                  <input
                    type="number"
                    value={editExtraNight}
                    onChange={(e) => setEditExtraNight(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Other Additional Allowances (₹)</label>
                  <input
                    type="number"
                    value={editOtherAllowances}
                    onChange={(e) => setEditOtherAllowances(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">TDS Monthly Tax Deduction (₹)</label>
                  <input
                    type="number"
                    value={editTds}
                    onChange={(e) => setEditTds(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Other Deductions / Advances (₹)</label>
                  <input
                    type="number"
                    value={editOtherDeductions}
                    onChange={(e) => setEditOtherDeductions(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Payment Status</label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e: any) => setEditPaymentStatus(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900"
                  >
                    <option value="UNPAID">UNPAID</option>
                    <option value="PAID">PAID</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Admin Remarks / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Approved incentive for milestone delivery"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
                >
                  {actionLoading ? 'Saving...' : 'Save Adjustments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Salary Slip Modal */}
      {viewingSlipId && (
        <SalarySlipModal slipId={viewingSlipId} onClose={() => setViewingSlipId(null)} />
      )}
    </div>
  );
};
