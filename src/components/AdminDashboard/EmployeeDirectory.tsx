import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { Employee, LocationSite, Site } from '../../types';
import { EmployeeAvatar } from '../common/EmployeeAvatar';
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
  Mail,
  Phone,
  Briefcase,
  Layers,
  ChevronRight,
  Shield,
  Calendar,
  Lock,
  Building,
  User,
  ChevronDown,
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

  // Today's date in YYYY-MM-DD for joining date default
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // New Employee Form State
  const [newEmpId, setNewEmpId] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newInitialPass, setNewInitialPass] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDept, setNewDept] = useState('Engineering & Construction');
  const [newDesignation, setNewDesignation] = useState('Site Engineer');
  const [newJoiningDate, setNewJoiningDate] = useState(todayStr);
  const [newDateOfBirth, setNewDateOfBirth] = useState('');
  const [newReportingManagerId, setNewReportingManagerId] = useState<string>('');
  const [newReportingManagerName, setNewReportingManagerName] = useState<string>('');
  const [newOnboardTab, setNewOnboardTab] = useState<'IDENTITY' | 'SITES'>('IDENTITY');

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
  const [editJoiningDate, setEditJoiningDate] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editReportingManagerId, setEditReportingManagerId] = useState<string>('');
  const [editReportingManagerName, setEditReportingManagerName] = useState<string>('');
  const [editAssignedSiteIds, setEditAssignedSiteIds] = useState<string[]>([]);
  const [editAssignedLocationIds, setEditAssignedLocationIds] = useState<string[]>([]);
  const [editAccountStatus, setEditAccountStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [editTab, setEditTab] = useState<'IDENTITY' | 'SITES'>('IDENTITY');

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

  // Reporting Manager Search Dropdown in Forms
  const [managerSearchQuery, setManagerSearchQuery] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  const fetchEmployeesAndSites = async () => {
    try {
      setLoading(true);
      const [empRes, siteRes] = await Promise.all([
        api.getEmployees(),
        api.getSites(),
      ]);
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
    setEditDepartment(emp.department || '');
    setEditDesignation(emp.designation || '');
    setEditJoiningDate(emp.joiningDate || todayStr);
    setEditDateOfBirth(emp.dateOfBirth || '');
    setEditReportingManagerId(emp.reportingManagerId || '');
    setEditReportingManagerName(emp.reportingManagerName || '');
    setEditAssignedSiteIds(emp.assignedSiteIds || []);
    setEditAssignedLocationIds(emp.assignedLocationIds || []);
    setEditAccountStatus(emp.accountStatus || 'ACTIVE');
    setEditTab('IDENTITY');
    setEditError('');
    setEditSuccess('');
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError('');

    if (!newJoiningDate) {
      setOnboardError('Joining Date is mandatory for all new staff onboardings.');
      return;
    }

    if (selectedSiteIds.length === 0) {
      setOnboardError('Please select at least 1 project site for the employee.');
      return;
    }

    try {
      setOnboardLoading(true);
      await api.createEmployee({
        employeeId: newEmpId.trim(),
        username: newUsername.trim(),
        initialPassword: newInitialPass,
        fullName: newFullName.trim(),
        mobile: newMobile.trim(),
        email: newEmail.trim(),
        department: newDept,
        designation: newDesignation,
        joiningDate: newJoiningDate,
        dateOfBirth: newDateOfBirth || undefined,
        reportingManagerId: newReportingManagerId || undefined,
        assignedSiteIds: selectedSiteIds,
        assignedLocationIds: selectedLocationIds,
      });

      setShowOnboardModal(false);
      setNewEmpId('');
      setNewUsername('');
      setNewInitialPass('');
      setNewFullName('');
      setNewMobile('');
      setNewEmail('');
      setNewReportingManagerId('');
      setNewReportingManagerName('');
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

    if (!editJoiningDate) {
      setEditError('Joining Date is mandatory.');
      return;
    }

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
        joiningDate: editJoiningDate,
        dateOfBirth: editDateOfBirth || undefined,
        reportingManagerId: editReportingManagerId || null,
        reportingManagerName: editReportingManagerName || null,
        assignedSiteIds: editAssignedSiteIds,
        assignedLocationIds: editAssignedLocationIds,
        accountStatus: editAccountStatus,
      });

      if (res.success) {
        setEditSuccess('Employee profile updated successfully.');
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
    <div id="employee-directory" className="space-y-6 text-slate-900">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Staff Workforce Directory
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                {employees.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Onboarding, Mandatory Joining Dates, Reporting Managers & Multi-Site Access
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setShowOnboardModal(true);
                setNewOnboardTab('IDENTITY');
              }}
              className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-2 transition shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Onboard Employee</span>
            </button>

            <button
              onClick={fetchEmployeesAndSites}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Name, ID, Username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            />
          </div>

          <div>
            <select
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none"
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
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none"
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

        {/* Desktop & Tablet Table */}
        <div className="mt-6 hidden md:block overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">Loading workforce records...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">No staff members found matching query.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">Staff Profile</th>
                  <th className="pb-3 px-3">Department & Hierarchy</th>
                  <th className="pb-3 px-3">Assigned Projects</th>
                  <th className="pb-3 px-3">Joining Date</th>
                  <th className="pb-3 px-3">Device Lock</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  return (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center space-x-3">
                          <EmployeeAvatar
                            name={emp.fullName}
                            size="md"
                            status={emp.accountStatus === 'ACTIVE' ? 'ACTIVE' : null}
                          />
                          <div>
                            <div className="font-bold text-sm text-slate-900">{emp.fullName}</div>
                            <div className="font-mono text-[10px] text-slate-400 font-semibold">
                              {emp.employeeId} &bull; @{emp.username || emp.employeeId}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold uppercase tracking-wide text-slate-800 text-[11px]">
                          {emp.designation || 'Staff'}
                        </div>
                        <div className="text-[11px] text-slate-500">{emp.department || 'Operations'}</div>
                        {emp.reportingManagerName && (
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1">
                            <span>Mgr:</span>
                            <span className="font-semibold text-slate-600">{emp.reportingManagerName}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(emp.assignedSiteIds || []).length === 0 ? (
                            <span className="text-[10px] text-slate-400 font-mono">None</span>
                          ) : (
                            (emp.assignedSiteIds || []).map((id: string) => {
                              const s = sites.find((site) => site.siteId === id);
                              return (
                                <span
                                  key={id}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200"
                                >
                                  {s ? s.siteName : id}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-mono text-slate-700 font-medium">
                          {emp.joiningDate || 'N/A'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        {emp.boundHardwareSignature || emp.isDeviceBound ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeviceResetError('');
                              setDeviceResetReason('');
                              setResetDeviceModalEmp(emp);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 transition cursor-pointer group"
                            title="Click to unbind and reset hardware lock"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600 group-hover:hidden" />
                            <Smartphone className="w-3 h-3 text-amber-600 hidden group-hover:inline" />
                            <span className="group-hover:hidden">1:1 Bound</span>
                            <span className="hidden group-hover:inline font-bold">Unbind</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            <span>Unbound</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            emp.accountStatus === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {emp.accountStatus || 'ACTIVE'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setViewEmployeeModalEmp(emp)}
                            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            title="View Full Profile"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
                            title="Edit Employee Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeviceResetError('');
                              setDeviceResetReason('');
                              setResetDeviceModalEmp(emp);
                            }}
                            className="p-1.5 rounded-xl bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                            title="Unbind / Reset Employee Hardware Device"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetPassModalEmp(emp)}
                            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            title="Reset Temporary Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
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

        {/* Mobile & Small Screen Cards */}
        <div className="mt-4 block md:hidden space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">Loading workforce records...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">No staff members found matching query.</div>
          ) : (
            filteredEmployees.map((emp) => (
              <div
                key={emp.employeeId}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <EmployeeAvatar
                      name={emp.fullName}
                      size="md"
                      status={emp.accountStatus === 'ACTIVE' ? 'ACTIVE' : null}
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900">{emp.fullName}</div>
                      <div className="font-mono text-[10px] text-slate-500 font-medium">
                        {emp.employeeId} &bull; @{emp.username || emp.employeeId}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {emp.designation || 'Staff'} &bull; {emp.department || 'Operations'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      emp.accountStatus === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {emp.accountStatus || 'ACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Device Lock:</span>
                    {emp.boundHardwareSignature || emp.isDeviceBound ? (
                      <span className="font-semibold text-emerald-700 text-[11px] flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>1:1 Bound</span>
                      </span>
                    ) : (
                      <span className="font-medium text-slate-500 text-[11px]">Unbound</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Joining Date:</span>
                    <span className="font-mono text-slate-700 text-[11px] font-medium">
                      {emp.joiningDate || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewEmployeeModalEmp(emp)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex flex-col items-center justify-center space-y-0.5 cursor-pointer touch-target"
                    title="View Profile"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-[9px]">View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(emp)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex flex-col items-center justify-center space-y-0.5 cursor-pointer touch-target"
                    title="Edit Employee"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[9px]">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeviceResetError('');
                      setDeviceResetReason('');
                      setResetDeviceModalEmp(emp);
                    }}
                    className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold flex flex-col items-center justify-center space-y-0.5 cursor-pointer touch-target"
                    title="Unbind Device"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[9px]">Unbind</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetPassModalEmp(emp)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex flex-col items-center justify-center space-y-0.5 cursor-pointer touch-target"
                    title="Reset Password"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-[9px]">Pass</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =============================================================
          MODAL 1: VIEW EMPLOYEE PROFILE (SECTIONAL BREAKDOWN)
          ============================================================= */}
      {viewEmployeeModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 space-y-6">
            <button
              onClick={() => setViewEmployeeModalEmp(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center space-x-4 pb-6 border-b border-slate-100">
              <EmployeeAvatar
                name={viewEmployeeModalEmp.fullName}
                size="lg"
                status={viewEmployeeModalEmp.accountStatus === 'ACTIVE' ? 'ACTIVE' : null}
              />
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {viewEmployeeModalEmp.fullName}
                </h3>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-0.5">
                  {viewEmployeeModalEmp.designation || 'Staff'} &bull;{' '}
                  <span className="font-mono text-slate-500 font-normal">{viewEmployeeModalEmp.employeeId}</span>
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {viewEmployeeModalEmp.accountStatus || 'ACTIVE'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    @{viewEmployeeModalEmp.username || viewEmployeeModalEmp.employeeId}
                  </span>
                </div>
              </div>
            </div>

            {/* Structured Sections */}
            <div className="space-y-4 text-xs">
              {/* Section 1: Contact & Employment */}
              <div>
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Employment & Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Joining Date:</span>
                    <span className="font-mono font-bold text-slate-900">{viewEmployeeModalEmp.joiningDate || 'N/A'}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Reporting Manager:</span>
                    <span className="font-semibold text-slate-900">
                      {viewEmployeeModalEmp.reportingManagerName || viewEmployeeModalEmp.reportingManagerId || 'None'}
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Email:</span>
                    <span className="font-semibold text-slate-900">{viewEmployeeModalEmp.email || 'N/A'}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Mobile:</span>
                    <span className="font-mono font-semibold text-slate-900">{viewEmployeeModalEmp.mobile || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Authorized Projects */}
              <div>
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Authorized Multi-Site Projects
                </h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="flex flex-wrap gap-1.5">
                    {(viewEmployeeModalEmp.assignedSiteIds || []).map((siteId: string) => {
                      const s = sites.find((site) => site.siteId === siteId);
                      return (
                        <span
                          key={siteId}
                          className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 shadow-2xs"
                        >
                          {s ? s.siteName : siteId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 3: Hardware Device Security Lock */}
              <div>
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hardware Device Lock & Binding</span>
                </h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      {viewEmployeeModalEmp.boundHardwareSignature || viewEmployeeModalEmp.isDeviceBound ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>1:1 Bound Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          <span>Unbound / Ready to Register</span>
                        </span>
                      )}
                    </div>
                    {viewEmployeeModalEmp.boundHardwareSignature && (
                      <div className="text-[11px] font-mono text-slate-500 mt-1.5">
                        <span className="text-slate-400 font-sans text-[10px]">Lock Signature: </span>
                        {viewEmployeeModalEmp.boundHardwareSignature}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const emp = viewEmployeeModalEmp;
                      setViewEmployeeModalEmp(null);
                      setDeviceResetError('');
                      setDeviceResetReason('');
                      setResetDeviceModalEmp(emp);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-amber-700" />
                    <span>Unbind / Reset Device</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setViewEmployeeModalEmp(null);
                  openEditModal(viewEmployeeModalEmp);
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center space-x-2 transition shadow-xs cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => setViewEmployeeModalEmp(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 2: EDIT EMPLOYEE PROFILE
          ============================================================= */}
      {editEmployeeModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setEditEmployeeModalEmp(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <EmployeeAvatar name={editFullName} size="md" />
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Edit Employee Profile</h3>
                <p className="text-xs text-slate-500 font-mono">{editEmpId}</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 p-1 bg-slate-100 rounded-2xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setEditTab('IDENTITY')}
                className={`flex-1 py-2 rounded-xl transition ${
                  editTab === 'IDENTITY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                👤 Identity & Employment
              </button>
              <button
                type="button"
                onClick={() => setEditTab('SITES')}
                className={`flex-1 py-2 rounded-xl transition ${
                  editTab === 'SITES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🏢 Multi-Site Projects
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEditEmployeeSubmit} className="space-y-4 text-xs">
              {editTab === 'IDENTITY' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Employee ID</label>
                      <input
                        type="text"
                        value={editEmpId}
                        onChange={(e) => setEditEmpId(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Mandatory Joining Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={editJoiningDate}
                        onChange={(e) => setEditJoiningDate(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Reporting Manager</label>
                      <select
                        value={editReportingManagerId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setEditReportingManagerId(id);
                          const mgr = employees.find((m) => m.employeeId === id);
                          setEditReportingManagerName(mgr ? mgr.fullName : '');
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none"
                      >
                        <option value="">No Manager / Executive</option>
                        {employees
                          .filter((emp) => emp.employeeId !== editEmpId)
                          .map((emp) => (
                            <option key={emp.employeeId} value={emp.employeeId}>
                              {emp.fullName} ({emp.employeeId}) - {emp.designation}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Username</label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Email</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Mobile</label>
                      <input
                        type="tel"
                        value={editMobile}
                        onChange={(e) => setEditMobile(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Department</label>
                      <input
                        type="text"
                        value={editDepartment}
                        onChange={(e) => setEditDepartment(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Designation</label>
                      <input
                        type="text"
                        value={editDesignation}
                        onChange={(e) => setEditDesignation(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Account Status</label>
                      <select
                        value={editAccountStatus}
                        onChange={(e) => setEditAccountStatus(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'SITES' && (
                <div className="space-y-3">
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
                          className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                            isChecked
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Building2 className={`w-4 h-4 ${isChecked ? 'text-amber-400' : 'text-slate-400'}`} />
                            <span className="font-bold text-xs">{s.siteName}</span>
                          </div>
                          <span className={`text-[10px] font-mono ${isChecked ? 'text-amber-300' : 'text-slate-400'}`}>
                            {s.siteId}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditEmployeeModalEmp(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 3: ONBOARD EMPLOYEE MODAL (WITH MANDATORY JOINING DATE & SITES)
          ============================================================= */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 space-y-5">
            <button
              onClick={() => setShowOnboardModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Onboard New Employee</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Provision workforce credentials, mandatory joining date, reporting hierarchy & project site access.
              </p>
            </div>

            {/* Step Navigation Tabs */}
            <div className="flex space-x-1 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setNewOnboardTab('IDENTITY')}
                className={`flex-1 py-2 rounded-xl transition ${
                  newOnboardTab === 'IDENTITY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                👤 Identity & Role
              </button>
              <button
                type="button"
                onClick={() => setNewOnboardTab('SITES')}
                className={`flex-1 py-2 rounded-xl transition ${
                  newOnboardTab === 'SITES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                🏢 Multi-Site Access
              </button>
            </div>

            {onboardError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{onboardError}</span>
              </div>
            )}

            <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs">
              {newOnboardTab === 'IDENTITY' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Employee ID</label>
                      <input
                        type="text"
                        value={newEmpId}
                        onChange={(e) => setNewEmpId(e.target.value)}
                        placeholder="e.g. EMP101"
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Username</label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="e.g. rahul.sharma"
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                      <input
                        type="text"
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Temporary Initial Password</label>
                      <input
                        type="text"
                        value={newInitialPass}
                        onChange={(e) => setNewInitialPass(e.target.value)}
                        placeholder="Min. 8 characters"
                        required
                        minLength={8}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Mandatory Joining Date & Reporting Manager Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Mandatory Joining Date <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={newJoiningDate}
                        onChange={(e) => setNewJoiningDate(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Reporting Manager</label>
                      <select
                        value={newReportingManagerId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setNewReportingManagerId(id);
                          const mgr = employees.find((m) => m.employeeId === id);
                          setNewReportingManagerName(mgr ? mgr.fullName : '');
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none"
                      >
                        <option value="">No Manager / Executive</option>
                        {employees.map((emp) => (
                          <option key={emp.employeeId} value={emp.employeeId}>
                            {emp.fullName} ({emp.employeeId}) - {emp.designation}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Email Address</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="e.g. rahul.sharma@example.com"
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        value={newMobile}
                        onChange={(e) => setNewMobile(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Department</label>
                      <input
                        type="text"
                        value={newDept}
                        onChange={(e) => setNewDept(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Designation</label>
                      <input
                        type="text"
                        value={newDesignation}
                        onChange={(e) => setNewDesignation(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {newOnboardTab === 'SITES' && (
                <div className="space-y-3">
                  <label className="block text-slate-800 font-bold mb-2">
                    Assign Project Sites (Multi-Site Authorization)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sites.map((s) => {
                      const isChecked = selectedSiteIds.includes(s.siteId);
                      return (
                        <div
                          key={s.siteId}
                          onClick={() => toggleSiteInList(s.siteId, selectedSiteIds, setSelectedSiteIds)}
                          className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                            isChecked
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Building2 className={`w-4 h-4 ${isChecked ? 'text-amber-400' : 'text-slate-400'}`} />
                            <span className="font-bold text-xs">{s.siteName}</span>
                          </div>
                          <span className={`text-[10px] font-mono ${isChecked ? 'text-amber-300' : 'text-slate-400'}`}>
                            {s.siteId}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardLoading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {onboardLoading ? 'Onboarding...' : 'Onboard Employee'}
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
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Issue Temporary Password</h3>
                <p className="text-xs text-slate-500">{resetPassModalEmp.fullName}</p>
              </div>
            </div>

            {passResetSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{passResetSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">New Temporary Password</label>
                <input
                  type="text"
                  value={tempPass}
                  onChange={(e) => setTempPass(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPassModalEmp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passResetLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {passResetLoading ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 5: UNBIND / RESET EMPLOYEE DEVICE
          ============================================================= */}
      {resetDeviceModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Unbind Hardware Device Lock</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {resetDeviceModalEmp.fullName} ({resetDeviceModalEmp.employeeId})
                </p>
              </div>
            </div>

            {deviceResetError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{deviceResetError}</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Department:</span>
                <span className="text-slate-800 font-bold">{resetDeviceModalEmp.department || 'Operations'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Designation:</span>
                <span className="text-slate-800 font-bold">{resetDeviceModalEmp.designation || 'Staff'}</span>
              </div>
              {resetDeviceModalEmp.boundHardwareSignature && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Current Lock Sig:</span>
                  <span className="font-mono text-[11px] text-slate-700 font-semibold truncate max-w-[170px]">
                    {resetDeviceModalEmp.boundHardwareSignature}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Unbinding this device immediately removes the 1:1 hardware restriction for <strong className="text-slate-900">{resetDeviceModalEmp.fullName}</strong>. The employee will be able to register and clock in from their new or repaired device on their next sign-in.
            </p>

            <form onSubmit={handleDeviceReset} className="space-y-4 text-xs">
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetDeviceModalEmp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deviceResetLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {deviceResetLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Unbinding...</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Confirm & Unbind Device</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
