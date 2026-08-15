import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { SalarySlip } from '../../types';
import {
  Banknote,
  Calendar,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  Printer,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { SalarySlipModal } from '../common/SalarySlipModal';

export const MySalarySlips: React.FC = () => {
  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedSlipId, setSelectedSlipId] = useState<string | null>(null);

  const fetchSlips = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getMySalarySlips();
      if (res.success) {
        setSlips(res.slips || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your salary slips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlips();
  }, []);

  return (
    <div id="my-salary-slips-root" className="space-y-4">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-slate-900 text-amber-400">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">My Salary Slips & Vouchers</h3>
            <p className="text-xs text-slate-500">
              Access and download official monthly pay slips with attendance muster proration and tax calculations.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs animate-pulse">
          Loading published salary slips...
        </div>
      ) : slips.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-slate-800">No Salary Slips Available Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Once monthly payroll is processed and published by the administration, your verified salary slips will appear here for instant download and printing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {slips.map((slip) => (
            <div
              key={slip.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 shadow-xs transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-sm text-slate-900">{slip.month}</span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {slip.paymentStatus}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Earned</span>
                    <span className="font-mono font-bold text-slate-800">
                      ₹{slip.totalGrossEarned.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Deductions</span>
                    <span className="font-mono font-bold text-rose-700">
                      -₹{slip.totalDeductions.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Net In-Hand</span>
                    <span className="font-mono font-black text-sm text-emerald-700">
                      ₹{slip.netSalary.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSlipId(slip.id)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center space-x-2 transition shadow-xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>View & Print Salary Slip</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Printable Modal */}
      {selectedSlipId && (
        <SalarySlipModal
          slipId={selectedSlipId}
          isEmployeeSelfService={true}
          onClose={() => setSelectedSlipId(null)}
        />
      )}
    </div>
  );
};
