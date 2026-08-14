import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Employee, LocationSite, Site } from '../../types';
import {
  UserPlus,
  KeyRound,
  Smartphone,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  X,
  Building2,
  Edit2,
} from 'lucide-react';

interface EmployeeDirectoryProps {
  locations: LocationSite[];
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ locations }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [editSitesModalEmp, setEditSitesModalEmp] = useState<any>(null);
  const [resetPassModalEmp, setResetPassModalEmp] = useState<any>(null);
  const [resetDeviceModalEmp, setResetDeviceModalEmp] = useState<any>(null);

  // New Employee Form State
  const [newEmpId, setNewEmpId] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newInitialPass, setNewInitialPass] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDept, setNewDept] = useState('Engineering & Construction');
  const [newDesignation, setNewDesignation] = useState('Site Engineer');
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [onboardError, setOnboardError] = useState('');
  const [onboardLoading, setOnboardLoading] = useState(false);

  // Edit Multi-Site Form State
  const [editAssignedSiteIds, setEditAssignedSiteIds] = useState<string[]>([]);
  const [editSitesLoading, setEditSitesLoading] = useState(false);

  // Device Reset Form State
  const [deviceResetReason, setDeviceResetReason] = useState('');
  const [deviceResetError, setDeviceResetError] = useState('');
  const [deviceResetLoading, setDeviceResetLoading] = useState(false);

  // Password Reset Form State
  const [tempPass, setTempPass] = useState('');
  const [passResetLoading, setPassResetLoading] = useState(false);
  const [passResetSuccess, setPassResetSuccess] = useState('');

  const fetchEmployeesAndSites = async () => {
    try {
      setLoading(true);
      const [empRes, siteRes] = await Promise.all([api.getEmployees(), api.getSites()]);
      setEmployees(empRes.employees || []);
      setSites(siteRes.sites || []);
      if (selectedSiteIds.length === 0 && siteRes.sites?.length > 0) {
        setSelectedSiteIds([siteRes.sites[0].siteId]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesAndSites();
  }, []);

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError('');
    if (selectedSiteIds.length === 0) {
      setOnboardError('Please assign at least one active project site to the employee.');
      return;
    }

    try {
      setOnboardLoading(true);
      await api.createEmployee({
        employeeId: newEmpId,
        username: newUsername,
        initialPassword: newInitialPass,
        fullName: newFullName,
        mobile: newMobile,
        email: newEmail,
        department: newDept,
        designation: newDesignation,
        assignedSiteIds: selectedSiteIds,
      });
      setShowOnboardModal(false);
      setNewEmpId('');
      setNewUsername('');
      setNewFullName('');
      setNewMobile('');
      setNewEmail('');
      fetchEmployeesAndSites();
    } catch (err: any) {
      setOnboardError(err.message || 'Failed to create employee');
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleSaveMultiSites = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSitesModalEmp) return;
    if (editAssignedSiteIds.length === 0) {
      alert('An employee must be assigned to at least one site.');
      return;
    }

    try {
      setEditSitesLoading(true);
      await api.updateEmployee(editSitesModalEmp.employeeId, {
        assignedSiteIds: editAssignedSiteIds,
      });
      setEditSitesModalEmp(null);
      fetchEmployeesAndSites();
    } catch (err: any) {
      alert(err.message || 'Failed to update site assignments');
    } finally {
      setEditSitesLoading(false);
    }
  };

  const handleDeviceReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetDeviceModalEmp) return;
    setDeviceResetError('');
    try {
      setDeviceResetLoading(true);
      await api.resetEmployeeDevice(resetDeviceModalEmp.employeeId);
      setResetDeviceModalEmp(null);
      setDeviceResetReason('');
      fetchEmployeesAndSites();
    } catch (err: any) {
      setDeviceResetError(err.message || 'Failed to reset device binding');
    } finally {
      setDeviceResetLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModalEmp) return;
    try {
      setPassResetLoading(true);
      await api.resetEmployeePassword(resetPassModalEmp.employeeId, tempPass);
      setPassResetSuccess(`Password reset. User will be forced to change upon next login.`);
      setTimeout(() => {
        setResetPassModalEmp(null);
        setPassResetSuccess('');
        fetchEmployeesAndSites();
      }, 1500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPassResetLoading(false);
    }
  };

  const toggleSiteInList = (siteId: string, currentList: string[], setter: (v: string[]) => void) => {
    if (currentList.includes(siteId)) {
      if (currentList.length === 1) return; // Keep at least one
      setter(currentList.filter((s) => s !== siteId));
    } else {
      setter([...currentList, siteId]);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase();
    return (
      emp.fullName?.toLowerCase().includes(term) ||
      emp.employeeId?.toLowerCase().includes(term) ||
      emp.username?.toLowerCase().includes(term) ||
      emp.department?.toLowerCase().includes(term)
    );
  });

  return (
    <div id="employee-directory" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Staff Workforce Directory</h3>
          <p className="text-xs text-slate-500">Multi-Site Staff Assignments, Device Bindings & Credentials</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 outline-hidden w-44 sm:w-56"
            />
          </div>

          <button
            onClick={() => setShowOnboardModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Onboard Employee</span>
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading workforce records...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No staff members found matching query.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="pb-3 px-3">Staff Profile</th>
                <th className="pb-3 px-3">Department & Role</th>
                <th className="pb-3 px-3">Assigned Sites (Multi-Site)</th>
                <th className="pb-3 px-3">Device Binding</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const assignedSiteNames = (emp.assignedSiteIds || [])
                  .map((id: string) => sites.find((s) => s.siteId === id)?.siteName || id)
                  .join(', ');

                return (
                  <tr key={emp.employeeId} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900">{emp.fullName}</div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {emp.employeeId} • @{emp.username}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-medium text-slate-800">{emp.department}</div>
                      <div className="text-[11px] text-slate-500">{emp.designation}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-medium text-slate-900 truncate max-w-xs block">
                          {assignedSiteNames || 'No Sites'}
                        </span>
                        <button
                          onClick={() => {
                            setEditSitesModalEmp(emp);
                            setEditAssignedSiteIds(emp.assignedSiteIds || []);
                          }}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500"
                          title="Edit Site Assignments"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {(emp.assignedSiteIds || []).length} authorized active site(s)
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      {emp.isDeviceBound ? (
                        <div className="flex items-center space-x-1 text-emerald-800 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Bound</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Unbound</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${emp.accountStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {emp.accountStatus || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setResetPassModalEmp(emp)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setResetDeviceModalEmp(emp)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Reset Device Binding"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Multi-Site Assignment Modal */}
      {editSitesModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl relative">
            <button
              onClick={() => setEditSitesModalEmp(null)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Manage Multi-Site Authorization</h3>
            <p className="text-xs text-slate-500 mb-4">
              Configure which project sites <strong>{editSitesModalEmp.fullName}</strong> is authorized to sign in from.
            </p>

            <form onSubmit={handleSaveMultiSites} className="space-y-4 text-xs">
              <div className="space-y-2">
                {sites.map((s) => {
                  const isChecked = editAssignedSiteIds.includes(s.siteId);
                  return (
                    <div
                      key={s.siteId}
                      onClick={() => toggleSiteInList(s.siteId, editAssignedSiteIds, setEditAssignedSiteIds)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                        isChecked
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Building2 className={`w-4 h-4 ${isChecked ? 'text-amber-400' : 'text-slate-400'}`} />
                        <div>
                          <div className="font-semibold text-xs">{s.siteName}</div>
                          <div className={`text-[10px] ${isChecked ? 'text-slate-300' : 'text-slate-500'}`}>
                            ID: {s.siteId}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isChecked ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {isChecked ? 'Authorized' : 'Excluded'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditSitesModalEmp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSitesLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
                >
                  {editSitesLoading ? 'Saving...' : 'Save Site Assignments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboard Employee Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowOnboardModal(false)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Onboard Staff Member</h3>
            <p className="text-xs text-slate-500 mb-4">Provision workforce credentials & Multi-Site authorization</p>

            {onboardError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {onboardError}
              </div>
            )}

            <form onSubmit={handleOnboardSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={newEmpId}
                    onChange={(e) => setNewEmpId(e.target.value)}
                    placeholder="e.g. EMP005"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. rohit.sharma"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Rohit Sharma"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="+91 98000 00000"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@milestoneconsultancy.in"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Initial Temporary Password <span className="text-slate-400 font-normal">(Min. 8 characters)</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={newInitialPass}
                  onChange={(e) => setNewInitialPass(e.target.value)}
                  placeholder="Enter initial temporary password"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                />
              </div>

              {/* Multi-Site Selection Checkboxes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Assigned Project Sites (Select all authorized sites)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {sites.map((s) => {
                    const isChecked = selectedSiteIds.includes(s.siteId);
                    return (
                      <div
                        key={s.siteId}
                        onClick={() => toggleSiteInList(s.siteId, selectedSiteIds, setSelectedSiteIds)}
                        className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-semibold text-xs truncate">{s.siteName}</span>
                        <span className="text-[10px] font-mono">{isChecked ? '✓' : '+'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
                >
                  {onboardLoading ? 'Onboarding...' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPassModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl relative">
            <button
              onClick={() => setResetPassModalEmp(null)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Issue temporary password for <strong>{resetPassModalEmp.fullName}</strong>. User will be forced to change
              it on next login.
            </p>

            {passResetSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                {passResetSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Temporary Password <span className="text-slate-400 font-normal">(Min. 8 characters)</span>
                </label>
                <input
                  type="text"
                  value={tempPass}
                  onChange={(e) => setTempPass(e.target.value)}
                  placeholder="Enter temporary password"
                  minLength={8}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setResetPassModalEmp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passResetLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
                >
                  {passResetLoading ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Device Modal */}
      {resetDeviceModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl relative">
            <button
              onClick={() => setResetDeviceModalEmp(null)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Reset Device Binding</h3>
            <p className="text-xs text-slate-500 mb-4">
              Clear 1:1 hardware device binding lock for <strong>{resetDeviceModalEmp.fullName}</strong>.
            </p>

            <form onSubmit={handleDeviceReset} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                This will unbind the current browser/device installation key. The employee can now sign in from a new
                authorized device.
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setResetDeviceModalEmp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deviceResetLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition"
                >
                  {deviceResetLoading ? 'Resetting...' : 'Unbind Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
