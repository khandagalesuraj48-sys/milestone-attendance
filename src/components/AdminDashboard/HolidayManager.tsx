import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Holiday } from '../../types';
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  X,
} from 'lucide-react';

export const HolidayManager: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Form State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminHolidays();
      setHolidays(res.holidays || []);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to load holidays.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleOpenAdd = () => {
    setEditingHoliday(null);
    setName('');
    setDate(`${selectedYear}-01-01`);
    setIsMandatory(true);
    setDescription('');
    setFormError('');
    setShowModal(true);
  };

  const handleOpenEdit = (h: Holiday) => {
    setEditingHoliday(h);
    setName(h.name);
    setDate(h.date);
    setIsMandatory(h.isMandatory !== false);
    setDescription(h.description || '');
    setFormError('');
    setShowModal(true);
  };

  const handleDelete = async (id: string, hName: string) => {
    if (!window.confirm(`Are you sure you want to delete holiday "${hName}"?`)) return;

    try {
      setLoading(true);
      await api.deleteHoliday(id);
      setToastMessage({ type: 'success', text: `Holiday "${hName}" deleted successfully.` });
      await fetchHolidays();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Failed to delete holiday.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !date) {
      setFormError('Holiday name and date are required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingHoliday) {
        await api.updateHoliday(editingHoliday.id, {
          name: name.trim(),
          date,
          isMandatory,
          description: description.trim(),
        });
        setToastMessage({ type: 'success', text: `Holiday "${name}" updated successfully.` });
      } else {
        await api.createHoliday({
          name: name.trim(),
          date,
          isMandatory,
          description: description.trim(),
        });
        setToastMessage({ type: 'success', text: `Holiday "${name}" registered successfully.` });
      }
      setShowModal(false);
      await fetchHolidays();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save holiday.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter holidays by selected year and sort chronologically
  const yearHolidays = holidays
    .filter((h) => {
      const y = h.year || parseInt(h.date.split('-')[0], 10);
      return y === selectedYear;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const years = Array.from(
    new Set([
      new Date().getFullYear() - 1,
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      ...holidays.map((h) => h.year || parseInt(h.date.split('-')[0], 10)),
    ])
  ).sort((a, b) => a - b);

  return (
    <div id="holiday-manager-module" className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-slate-900 text-amber-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Company Holiday Calendar & Policy
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Official paid public and festival holidays. Leave applications overlapping these dates are exempt from deductions.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-hidden"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Holiday</span>
          </button>
        </div>
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

      {/* Grid of Holidays */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Registered Holidays ({yearHolidays.length})
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Note: Sunday is a normal working day per organizational policy.
          </span>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
              Loading holiday calendar...
            </div>
          ) : yearHolidays.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
              No holidays registered for {selectedYear}. Click "Add Holiday" to register official off-days.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {yearHolidays.map((h) => {
                const dateObj = new Date(h.date);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <div
                    key={h.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-300 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          {h.date}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(h)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                            title="Edit Holiday"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(h.id, h.name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Holiday"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 mt-2.5">{h.name}</h4>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        {dayName} &bull; {formattedDate}
                      </div>

                      {h.description && (
                        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed bg-white/80 p-2 rounded-xl border border-slate-200/60">
                          {h.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Paid Leave Deduction Exempt
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {h.isMandatory !== false ? 'Mandatory' : 'Optional'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingHoliday ? 'Edit Company Holiday' : 'Add New Company Holiday'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Holiday Name</label>
                <input
                  type="text"
                  placeholder="e.g. Independence Day, Diwali, Republic Day"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Holiday Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Description (Optional)</label>
                <textarea
                  placeholder="Additional context or notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-slate-900 outline-hidden"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isMandatory"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                />
                <label htmlFor="isMandatory" className="text-slate-700 font-semibold cursor-pointer">
                  Mandatory National / Official Public Holiday
                </label>
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {submitting ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Register Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
