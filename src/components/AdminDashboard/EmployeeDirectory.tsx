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
  Eye,
  MapPin,
  Filter,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface EmployeeDirectoryProps {
  locations: LocationSite[];
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({ locations }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('ALL');

  // Modals
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [viewEmployeeModalEmp, setViewEmployeeModalEmp] = useState<any>(null);
  const [editEmployeeModalEmp, setEditEmployeeModalEmp] = useState<any>(null);
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
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [onboardError, setOnboardError] = useState('');
  const [onboardLoading, setOnboardLoading] = useState(false);

  // Edit Employee Form State
  const [editEmpId, setEditEmpId] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editAssignedSiteIds, setEditAssignedSiteIds] = useState<string[]>([]);
  const [editAssignedLocationIds, setEditAssignedLocationIds] = useState<string[]>([]);
  const [editAccountStatus, setEditAccountStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [editLoading, setEditLoading] = useState(false);

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

  const openEditModal = (emp: any) => {
    setEditEmployeeModalEmp(emp);
    setEditEmpId(emp.employeeId || '');
    setEditFullName(emp.fullName || '');
    setEditUsername(emp.username || '');
    setEditEmail(emp.email || '');
    setEditMobile(emp.mobile || '');
    setEditDepartment(emp.department || 'Engineering & Construction');
    setEditDesignation(emp.designation || 'Site Engineer');
    setEditAssignedSiteIds(emp.assignedSiteIds || []);
    setEditAssignedLocationIds(emp.assignedLocationIds || []);
    setEditAccountStatus(emp.accountStatus || 'ACTIVE');
    setEditError('');
    setEditSuccess('');
  };

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
        assignedLocationIds: selectedLocationIds,
      });
      setShowOnboardModal(false);
      setNewEmpId('');
      setNewUsername('');
      setNewFullName('');
      setNewMobile('');
      setNewEmail('');
      setSelectedLocationIds([]);
      fetchEmployeesAndSites();
    } catch (err: any) {
      setOnboardError(err.message || 'Failed to create employee');
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleEditEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmployeeModalEmp) return;
    setEditError('');
    setEditSuccess('');

    if (editAssignedSiteIds.length === 0) {
      setEditError('An employee must be assigned to at least one project site.');
      return;
    }

    try {
      setEditLoading(true);
      const res = await api.updateEmployee(editEmployeeModalEmp.employeeId, {
        employeeId: editEmpId,
        fullName: editFullName,
        username: editUsername,
        email: editEmail,
        mobile: editMobile,
        department: editDepartment,
        designation: editDesignation,
        assignedSiteIds: editAssignedSiteIds,
        assignedLocationIds: editAssignedLocationIds,
        accountStatus: editAccountStatus,
      });

      if (res.success) {
        setEditSuccess('Employee updated successfully.');
        setTimeout(() => {
          setEditEmployeeModalEmp(null);
          fetchEmployeesAndSites();
        }, 800);
      }
    } catch (err: any) {
      setEditError(err.message || 'Failed to update employee profile.');
    } finally {
      setEditLoading(false);
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
      setDeviceResetError(err.message || 'Failed to reset hardware lock');
    } finally {
      setDeviceResetLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModalEmp) return;
    try {
      setPassResetLoading(true);
      setPassResetSuccess('');
      await api.resetEmployeePassword(resetPassModalEmp.employeeId, tempPass);
      setPassResetSuccess('Password reset successfully. Employee must change it on next login.');
      setTimeout(() => {
        setResetPassModalEmp(null);
        setTempPass('');
        setPassResetSuccess('');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setPassResetLoading(false);
    }
  };

  const toggleSiteInList = (siteId: string, currentList: string[], setList: (val: string[]) => void) => {
    if (currentList.includes(siteId)) {
      setList(currentList.filter((id) => id !== siteId));
    } else {
      setList([...currentList, siteId]);
    }
  };

  const toggleLocationInList = (locId: string, currentList: string[], setList: (val: string[]) => void) => {
    if (currentList.includes(locId)) {
      setList(currentList.filter((id) => id !== locId));
    } else {
      setList([...currentList, locId]);
    }
  };

  // Extract departments for filter
  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  const filteredEmployees = employees.filter((emp) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      emp.fullName?.toLowerCase().includes(q) ||
      emp.employeeId?.toLowerCase().includes(q) ||
      emp.username?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q);

    const matchesDept = selectedDeptFilter === 'ALL' || emp.department === selectedDeptFilter;
    const matchesSite =
      selectedSiteFilter === 'ALL' || (emp.assignedSiteIds || []).includes(selectedSiteFilter);

    return matchesSearch && matchesDept && matchesSite;
  });

  return (
    <div id="employee-directory" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Staff Workforce Directory</h3>
          <p className="text-xs text-slate-500">
            Multi-Site Staff Assignments, Profile Modifications, Device Bindings & Credentials
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowOnboardModal(true)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Onboard Employee</span>
          </button>

          <button
            onClick={fetchEmployeesAndSites}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, ID, Username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
          />
        </div>

        <div>
          <select
            value={selectedSiteFilter}
            onChange={(e) => setSelectedSiteFilter(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none"
          >
            <option value="ALL">All Project Sites ({sites.length})</option>
            {sites.map((s) => (
              <option key={s.siteId} value={s.siteId}>
                {s.siteName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none"
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
                      <div className="font-medium text-slate-900 truncate max-w-xs">
                        {assignedSiteNames || 'No Sites'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {(emp.assignedSiteIds || []).length} authorized active site(s)
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      {emp.isDeviceBound || emp.boundHardwareSignature ? (
                        <div className="flex items-center space-x-1 text-emerald-800 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Bound</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Unbound</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          emp.accountStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {emp.accountStatus || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setViewEmployeeModalEmp(emp)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="View Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Edit Employee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

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

      {/* =============================================================
          MODAL 1: EDIT EMPLOYEE MODAL (FULL DIRECTORY EDIT)
          ============================================================= */}
      {editEmployeeModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setEditEmployeeModalEmp(null)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Edit Employee Profile</h3>
            <p className="text-xs text-slate-500 mb-5">
              Update staff details, multi-site authorizations, and account status for{' '}
              <strong>{editEmployeeModalEmp.fullName}</strong>.
            </p>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEditEmployeeSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={editEmpId}
                    onChange={(e) => setEditEmpId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile</label>
                  <input
                    type="tel"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Account Status</label>
                  <select
                    value={editAccountStatus}
                    onChange={(e) => setEditAccountStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              {/* Multi-Site Assignment */}
              <div className="pt-3 border-t border-slate-200">
                <label className="block text-slate-800 font-bold mb-2">
                  Authorized Project Sites (Select 1 or more)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sites.map((s) => {
                    const isChecked = editAssignedSiteIds.includes(s.siteId);
                    return (
                      <div
                        key={s.siteId}
                        onClick={() => toggleSiteInList(s.siteId, editAssignedSiteIds, setEditAssignedSiteIds)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                          isChecked
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Building2 className={`w-4 h-4 ${isChecked ? 'text-amber-400' : 'text-slate-400'}`} />
                          <span className="font-semibold text-xs">{s.siteName}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isChecked ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isChecked ? 'Authorized' : 'Excluded'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Allowed Attendance Locations */}
              <div className="pt-3 border-t border-slate-200">
                <label className="block text-slate-800 font-bold mb-1">
                  Allowed Attendance Locations (Optional Perimeter Scope)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  If selected, employee can punch in at these specific geofence locations.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                  {locations.map((loc) => {
                    const locId = loc.locationId || loc.id;
                    const isChecked = editAssignedLocationIds.includes(locId);
                    return (
                      <div
                        key={locId}
                        onClick={() => toggleLocationInList(locId, editAssignedLocationIds, setEditAssignedLocationIds)}
                        className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between text-[11px] transition ${
                          isChecked
                            ? 'bg-amber-500 border-amber-600 text-white font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          <MapPin className={`w-3.5 h-3.5 ${isChecked ? 'text-white' : 'text-amber-600'}`} />
                          <span className="truncate">{loc.locationName || loc.name}</span>
                        </div>
                        <span className="font-mono text-[9px]">{loc.radiusMeters}m</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditEmployeeModalEmp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
                >
                  {editLoading ? 'Saving Changes...' : 'Save Employee Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 2: VIEW EMPLOYEE PROFILE MODAL
          ============================================================= */}
      {viewEmployeeModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setViewEmployeeModalEmp(null)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                {viewEmployeeModalEmp.fullName?.charAt(0) || 'E'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{viewEmployeeModalEmp.fullName}</h3>
                <div className="font-mono text-xs text-slate-500">
                  {viewEmployeeModalEmp.employeeId} • @{viewEmployeeModalEmp.username}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Department</span>
                <span className="font-semibold text-slate-900">{viewEmployeeModalEmp.department}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Designation</span>
                <span className="font-semibold text-slate-900">{viewEmployeeModalEmp.designation}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Email Address</span>
                <span className="font-mono font-semibold text-slate-900">{viewEmployeeModalEmp.email || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Mobile</span>
                <span className="font-mono font-semibold text-slate-900">{viewEmployeeModalEmp.mobile || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Hardware Device Status</span>
                <span className="font-semibold text-emerald-700 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    {viewEmployeeModalEmp.boundHardwareSignature || viewEmployeeModalEmp.isDeviceBound
                      ? 'Bound (1:1 Security Locked)'
                      : 'Unbound'}
                  </span>
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Account Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    viewEmployeeModalEmp.accountStatus === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {viewEmployeeModalEmp.accountStatus || 'ACTIVE'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">Authorized Project Sites</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(viewEmployeeModalEmp.assignedSiteIds || []).map((siteId: string) => {
                    const s = sites.find((site) => site.siteId === siteId);
                    return (
                      <span
                        key={siteId}
                        className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-semibold text-slate-800"
                      >
                        {s ? s.siteName : siteId}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setViewEmployeeModalEmp(null);
                  openEditModal(viewEmployeeModalEmp);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => setViewEmployeeModalEmp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 3: ONBOARD EMPLOYEE MODAL
          ============================================================= */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setShowOnboardModal(false)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Onboard New Employee</h3>
            <p className="text-xs text-slate-500 mb-4">
              Provision workforce profile, credentials, and multi-site access rights.
            </p>

            {onboardError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{onboardError}</span>
              </div>
            )}

            <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={newEmpId}
                    onChange={(e) => setNewEmpId(e.target.value)}
                    placeholder="e.g. EMP101"
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. rahul.sharma"
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Temporary Initial Password</label>
                  <input
                    type="text"
                    value={newInitialPass}
                    onChange={(e) => setNewInitialPass(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. rahul.sharma@example.com"
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              {/* Multi-Site Selection */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-slate-700 font-bold mb-1.5">
                  Assign Project Sites (Multi-Site Authorization)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sites.map((s) => {
                    const isChecked = selectedSiteIds.includes(s.siteId);
                    return (
                      <div
                        key={s.siteId}
                        onClick={() => toggleSiteInList(s.siteId, selectedSiteIds, setSelectedSiteIds)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                          isChecked
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Building2 className={`w-4 h-4 ${isChecked ? 'text-amber-400' : 'text-slate-400'}`} />
                          <span className="font-semibold text-xs">{s.siteName}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isChecked ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isChecked ? 'Authorized' : 'Excluded'}
                        </span>
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
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
                >
                  {onboardLoading ? 'Onboarding...' : 'Complete Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 4: RESET PASSWORD MODAL
          ============================================================= */}
      {resetPassModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
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

      {/* =============================================================
          MODAL 5: RESET DEVICE MODAL
          ============================================================= */}
      {resetDeviceModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
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

            {deviceResetError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {deviceResetError}
              </div>
            )}

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
