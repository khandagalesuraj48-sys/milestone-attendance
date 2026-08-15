import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { SalarySlip } from '../../types';
import {
  Printer,
  X,
  Building2,
  Calendar,
  CreditCard,
  Download,
  AlertCircle,
  FileCheck,
  Award,
} from 'lucide-react';

interface SalarySlipModalProps {
  slipId: string;
  isEmployeeSelfService?: boolean;
  onClose: () => void;
}

export const SalarySlipModal: React.FC<SalarySlipModalProps> = ({
  slipId,
  isEmployeeSelfService = false,
  onClose,
}) => {
  const [slip, setSlip] = useState<SalarySlip | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchSlip = async () => {
      try {
        setLoading(true);
        setError('');
        const res = isEmployeeSelfService
          ? await api.getMySalarySlip(slipId)
          : await api.getPayrollSlip(slipId);

        if (res.success && res.slip) {
          setSlip(res.slip);
        } else {
          setError('Salary slip not found or unavailable.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load salary slip.');
      } finally {
        setLoading(false);
      }
    };

    if (slipId) {
      fetchSlip();
    }
  }, [slipId, isEmployeeSelfService]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-full">
        {/* Header Bar - Hidden in Print */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm tracking-wide">
              Official Salary Slip {slip ? `• ${slip.month}` : ''}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !slip}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-900 print:p-6">
          {loading && (
            <div className="py-16 text-center text-slate-500 text-xs animate-pulse">
              Loading verified compensation voucher...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {slip && (
            <div id="printable-salary-slip" className="space-y-6">
              {/* Company Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center">
                      <img
                        src="/assets/branding/milestone-logo.svg"
                        alt="Milestone"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h1 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                        {slip.companyName || 'Milestone Consultancy'}
                      </h1>
                      <div className="text-[10px] text-slate-500 font-mono">
                        CIN: U74999MH2021PTC367891 • GSTIN: 27AABCM9876Q1ZM
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 max-w-md pt-1">
                    {slip.companyAddress || 'Unit 402, Signature Tower, S.B. Road, Pune, Maharashtra 411016'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-900 bg-amber-100 px-3 py-1 rounded-lg inline-block border border-amber-200">
                    PAYSLIP • {slip.month}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    Slip No: {slip.slipNumber}
                  </div>
                </div>
              </div>

              {/* Employee & Bank Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Employee Name</span>
                  <span className="font-bold text-slate-900">{slip.employeeName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Employee Code</span>
                  <span className="font-bold font-mono text-slate-900">{slip.employeeId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Designation</span>
                  <span className="font-medium text-slate-800">{slip.designation}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Department</span>
                  <span className="font-medium text-slate-800">{slip.department || 'Operations'}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Bank Name</span>
                  <span className="font-medium text-slate-800">{slip.bankName || 'HDFC Bank'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Account No.</span>
                  <span className="font-mono text-slate-800">{slip.accountNumber || '••••••••1234'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">IFSC Code</span>
                  <span className="font-mono text-slate-800">{slip.ifscCode || 'HDFC0001234'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">PAN / UAN</span>
                  <span className="font-mono text-slate-800">
                    {slip.panNumber || 'N/A'} / {slip.uanNumber || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Attendance Muster Summary */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 text-xs">
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-2">
                  Attendance & Proration Breakdown
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Total Days</span>
                    <span className="font-bold text-slate-900 font-mono">{slip.totalDaysInMonth}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Present Days</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {slip.presentFullDays + slip.presentHalfDays * 0.5}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Weekly Offs</span>
                    <span className="font-bold text-slate-900 font-mono">{slip.weeklyOffs}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Paid Leaves</span>
                    <span className="font-bold text-slate-900 font-mono">{slip.paidLeaves}</span>
                  </div>
                  <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                    <span className="text-[10px] text-rose-600 block">Unpaid / LOP</span>
                    <span className="font-bold text-rose-800 font-mono">{slip.lopDays}</span>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 block">Payable Days</span>
                    <span className="font-bold text-emerald-900 font-mono">{slip.paidDays}</span>
                  </div>
                </div>
              </div>

              {/* Dual Column: Earnings vs Deductions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <div className="bg-slate-900 text-white font-bold p-2.5 flex justify-between">
                    <span>EARNINGS</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="divide-y divide-slate-100 p-2 space-y-1">
                    <div className="flex justify-between py-1 px-2 text-slate-700">
                      <span>Basic Pay</span>
                      <span className="font-mono">₹{slip.earnedBasic.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 text-slate-700">
                      <span>House Rent Allowance (HRA)</span>
                      <span className="font-mono">₹{slip.earnedHra.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 text-slate-700">
                      <span>Conveyance Allowance</span>
                      <span className="font-mono">₹{slip.earnedConveyance.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 text-slate-700">
                      <span>Medical Allowance</span>
                      <span className="font-mono">₹{slip.earnedMedical.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 text-slate-700">
                      <span>Special Allowance</span>
                      <span className="font-mono">₹{slip.earnedSpecialAllowance.toLocaleString('en-IN')}</span>
                    </div>
                    {slip.extraNightBonus > 0 && (
                      <div className="flex justify-between py-1 px-2 text-amber-800 font-medium">
                        <span>Extra Night Shift Bonus</span>
                        <span className="font-mono">+₹{slip.extraNightBonus.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {slip.incentivesBonus > 0 && (
                      <div className="flex justify-between py-1 px-2 text-emerald-800 font-medium">
                        <span>Incentives & Rewards</span>
                        <span className="font-mono">+₹{slip.incentivesBonus.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {slip.earnedOtherAllowances > 0 && (
                      <div className="flex justify-between py-1 px-2 text-slate-700">
                        <span>Other Allowances</span>
                        <span className="font-mono">+₹{slip.earnedOtherAllowances.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 border-t border-slate-200 p-2.5 font-bold flex justify-between text-slate-900">
                    <span>Total Gross Earnings</span>
                    <span className="font-mono">₹{slip.totalGrossEarned.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Deductions Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <div className="bg-slate-900 text-white font-bold p-2.5 flex justify-between">
                    <span>DEDUCTIONS</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="divide-y divide-slate-100 p-2 space-y-1">
                    <div className="flex justify-between py-1 px-2 text-slate-700">
                      <span>Provident Fund (PF - Employee)</span>
                      <span className="font-mono">₹{slip.pfDeduction.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2 text-slate-700">
                      <span>Professional Tax (PT - Maharashtra)</span>
                      <span className="font-mono">₹{slip.ptDeduction.toLocaleString('en-IN')}</span>
                    </div>
                    {slip.tdsDeduction > 0 && (
                      <div className="flex justify-between py-1 px-2 text-slate-700">
                        <span>Tax Deducted at Source (TDS)</span>
                        <span className="font-mono">₹{slip.tdsDeduction.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {slip.otherDeductions > 0 && (
                      <div className="flex justify-between py-1 px-2 text-slate-700">
                        <span>Other Deductions / Advance</span>
                        <span className="font-mono">₹{slip.otherDeductions.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 border-t border-slate-200 p-2.5 font-bold flex justify-between text-rose-800">
                    <span>Total Deductions</span>
                    <span className="font-mono">-₹{slip.totalDeductions.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Net Payable Banner */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest block">
                    NET PAYABLE AMOUNT
                  </span>
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5">
                    ₹{slip.netSalary.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-300 italic mt-1 font-sans">
                    {slip.netSalaryInWords}
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-400 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
                  <div>Payment Status: <span className="font-bold text-white">{slip.paymentStatus}</span></div>
                  <div>Payment Mode: <span className="text-white">Direct Bank Transfer (NEFT/RTGS)</span></div>
                </div>
              </div>

              {/* Footer / Signatures */}
              <div className="pt-8 border-t border-slate-200 flex items-end justify-between text-[11px] text-slate-500">
                <div>
                  <div className="font-semibold text-slate-800">Milestone Consultancy Services</div>
                  <div>This is a computer-generated salary slip and does not require physical signature.</div>
                </div>

                <div className="text-center">
                  <div className="w-32 border-b border-slate-400 mb-1" />
                  <span className="text-[10px] font-bold text-slate-700 uppercase">Authorized Signatory</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
