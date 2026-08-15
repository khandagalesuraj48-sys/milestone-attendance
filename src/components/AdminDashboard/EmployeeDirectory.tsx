import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { Employee, LocationSite, Site, SalaryStructure } from '../../types';
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
  DollarSign,
  Lock,
  CreditCard,
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
  const [newOnboardTab, setNewOnboardTab] = useState<'IDENTITY' | 'SITES' | 'SALARY'>('IDENTITY');

  // New Employee Salary Structure
  const [newMonthlyGross, setNewMonthlyGross] = useState<number>(35000);
  const [newBasicSalary, setNewBasicSalary] = useState<number>(17500);
  const [newHra, setNewHra] = useState<number>(8750);
  const [newSpecialAllowance, setNewSpecialAllowance] = useState<number>(6750);
  const [newConveyanceAllowance, setNewConveyanceAllowance] = useState<number>(2000);
  const [newPfEnabled, setNewPfEnabled] = useState<boolean>(true);
  const [newPfType, setNewPfType] = useState<'PERCENTAGE' | 'FIXED' | 'EXEMPT'>('PERCENTAGE');
  const [newPfFixedAmount, setNewPfFixedAmount] = useState<number>(1800);
  const [newPtEnabled, setNewPtEnabled] = useState<boolean>(true);
  const [newTdsMonthly, setNewTdsMonthly] = useState<number>(0);
  const [newBankName, setNewBankName] = useState<string>('HDFC Bank');
  const [newAccountNumber, setNewAccountNumber] = useState<string>('');
  const [newIfscCode, setNewIfscCode] = useState<string>('HDFC0001234');
  const [newPanNumber, setNewPanNumber] = useState<string>('');
  const [newUanNumber, setNewUanNumber] = useState<string>('');

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
  const [editTab, setEditTab] = useState<'IDENTITY' | 'SITES' | 'SALARY'>('IDENTITY');

  // Edit Employee Salary Structure
  const [editMonthlyGross, setEditMonthlyGross] = useState<number>(0);
  const [editBasicSalary, setEditBasicSalary] = useState<number>(0);
  const [editHra, setEditHra] = useState<number>(0);
  const [editSpecialAllowance, setEditSpecialAllowance] = useState<number>(0);
  const [editConveyanceAllowance, setEditConveyanceAllowance] = useState<number>(0);
  const [editPfEnabled, setEditPfEnabled] = useState<boolean>(true);
  const [editPfType, setEditPfType] = useState<'PERCENTAGE' | 'FIXED' | 'EXEMPT'>('PERCENTAGE');
  const [editPfFixedAmount, setEditPfFixedAmount] = useState<number>(1800);
  const [editPtEnabled, setEditPtEnabled] = useState<boolean>(true);
  const [editTdsMonthly, setEditTdsMonthly] = useState<number>(0);
  const [editBankName, setEditBankName] = useState<string>('');
  const [editAccountNumber, setEditAccountNumber] = useState<string>('');
  const [editIfscCode, setEditIfscCode] = useState<string>('');
  const [editPanNumber, setEditPanNumber] = useState<string>('');
  const [editUanNumber, setEditUanNumber] = useState<string>('');

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

    // Populate Salary Structure if exists
    const sal = emp.salaryStructure || {};
    setEditMonthlyGross(sal.monthlyGrossCtc || 35000);
    setEditBasicSalary(sal.basicSalary || Math.round((sal.monthlyGrossCtc || 35000) * 0.5));
    setEditHra(sal.hra || Math.round((sal.monthlyGrossCtc || 35000) * 0.25));
    setEditSpecialAllowance(sal.specialAllowance || 0);
    setEditConveyanceAllowance(sal.conveyanceAllowance || 0);
    setEditPfEnabled(sal.pfDeductionType !== 'EXEMPT');
    setEditPfType(sal.pfDeductionType || 'PERCENTAGE');
    setEditPfFixedAmount(sal.pfFixedAmount || 1800);
    setEditPtEnabled(sal.ptDeductionEnabled !== false);
    setEditTdsMonthly(sal.tdsMonthlyAmount || 0);
    setEditBankName(sal.bankDetails?.bankName || '');
    setEditAccountNumber(sal.bankDetails?.accountNumber || '');
    setEditIfscCode(sal.bankDetails?.ifscCode || '');
    setEditPanNumber(sal.bankDetails?.panNumber || '');
    setEditUanNumber(sal.bankDetails?.uanNumber || '');

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

    // Build complete salary structure payload
    const salaryStructure: SalaryStructure = {
      monthlyGross: Number(newMonthlyGross) || 0,
      monthlyGrossCtc: Number(newMonthlyGross) || 0,
      basicSalary: Number(newBasicSalary) || 0,
      hra: Number(newHra) || 0,
      specialAllowance: Number(newSpecialAllowance) || 0,
      conveyanceAllowance: Number(newConveyanceAllowance) || 0,
      medicalAllowance: 0,
      otherAllowances: 0,
      pfDeductionType: newPfEnabled ? newPfType : 'EXEMPT',
      pfPercentage: 12,
      pfFixedAmount: Number(newPfFixedAmount) || 1800,
      ptDeductionEnabled: newPtEnabled,
      ptStateSlab: 'MAHARASHTRA',
      tdsMonthlyAmount: Number(newTdsMonthly) || 0,
      effectiveFrom: newJoiningDate || todayStr,
      bankDetails: {
        bankName: newBankName.trim(),
        accountNumber: newAccountNumber.trim(),
        ifscCode: newIfscCode.trim().toUpperCase(),
        panNumber: newPanNumber.trim().toUpperCase(),
        uanNumber: newUanNumber.trim(),
      },
    };

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
        salaryStructure,
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

    const updatedSalaryStructure: SalaryStructure = {
      monthlyGross: Number(editMonthlyGross) || 0,
      monthlyGrossCtc: Number(editMonthlyGross) || 0,
      basicSalary: Number(editBasicSalary) || 0,
      hra: Number(editHra) || 0,
      specialAllowance: Number(editSpecialAllowance) || 0,
      conveyanceAllowance: Number(editConveyanceAllowance) || 0,
      medicalAllowance: 0,
      otherAllowances: 0,
      pfDeductionType: editPfEnabled ? editPfType : 'EXEMPT',
      pfPercentage: 12,
      pfFixedAmount: Number(editPfFixedAmount) || 1800,
      ptDeductionEnabled: editPtEnabled,
      ptStateSlab: 'MAHARASHTRA',
      tdsMonthlyAmount: Number(editTdsMonthly) || 0,
      effectiveFrom: editJoiningDate || todayStr,
      bankDetails: {
        bankName: editBankName.trim(),
        accountNumber: editAccountNumber.trim(),
        ifscCode: editIfscCode.trim().toUpperCase(),
        panNumber: editPanNumber.trim().toUpperCase(),
        uanNumber: editUanNumber.trim(),
      },
    };

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
        salaryStructure: updatedSalaryStructure,
      });

      if (res.success) {
        setEditSuccess('Employee profile and salary structure updated successfully.');
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
              Onboarding, Mandatory Joining Dates, Reporting Managers & Confidential Salary Structures
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
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" />
                            <span>1:1 Bound</span>
                          </span>
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
                            onClick={() => setViewEmployeeModalEmp(emp)}
                            className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            title="View Full Profile & Salary Structure"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
                            title="Edit Employee & Salary"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
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

              {/* Section 3: Confidential Salary Structure (Admin-Only View) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Confidential Salary Structure (Admin Only)</span>
                  </h4>
                  <span className="text-[10px] text-amber-700 font-semibold px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200">
                    Restricted
                  </span>
                </div>
                {viewEmployeeModalEmp.salaryStructure ? (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">Monthly Gross CTC</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ₹{Number(viewEmployeeModalEmp.salaryStructure.monthlyGrossCtc || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">Basic Salary</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ₹{Number(viewEmployeeModalEmp.salaryStructure.basicSalary || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">HRA</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ₹{Number(viewEmployeeModalEmp.salaryStructure.hra || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-semibold">Special Allowance</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          ₹{Number(viewEmployeeModalEmp.salaryStructure.specialAllowance || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500">PF Status:</span>{' '}
                        <span className="font-bold text-slate-800">
                          {viewEmployeeModalEmp.salaryStructure.pfDeductionType || 'PERCENTAGE'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">PT Deduct:</span>{' '}
                        <span className="font-bold text-slate-800">
                          {viewEmployeeModalEmp.salaryStructure.ptDeductionEnabled ? 'Enabled' : 'Exempt'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">TDS Monthly:</span>{' '}
                        <span className="font-mono font-bold text-slate-800">
                          ₹{Number(viewEmployeeModalEmp.salaryStructure.tdsMonthlyAmount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    {viewEmployeeModalEmp.salaryStructure.bankDetails && (
                      <div className="pt-2 border-t border-slate-200/60 text-[11px] grid grid-cols-2 gap-2 font-mono">
                        <div>
                          <span className="text-slate-500 font-sans">Bank:</span>{' '}
                          <span className="font-bold text-slate-800">
                            {viewEmployeeModalEmp.salaryStructure.bankDetails.bankName || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-sans">A/C:</span>{' '}
                          <span className="font-bold text-slate-800">
                            {viewEmployeeModalEmp.salaryStructure.bankDetails.accountNumber || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-sans">IFSC:</span>{' '}
                          <span className="font-bold text-slate-800">
                            {viewEmployeeModalEmp.salaryStructure.bankDetails.ifscCode || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-sans">PAN:</span>{' '}
                          <span className="font-bold text-slate-800">
                            {viewEmployeeModalEmp.salaryStructure.bankDetails.panNumber || 'N/A'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-slate-500">
                    No custom salary structure configured yet. Standard default slabs apply.
                  </div>
                )}
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
                <span>Edit Profile & Salary</span>
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
          MODAL 2: EDIT EMPLOYEE PROFILE & SALARY STRUCTURE
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
                <h3 className="text-lg font-extrabold text-slate-900">Edit Employee & Salary Structure</h3>
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
              <button
                type="button"
                onClick={() => setEditTab('SALARY')}
                className={`flex-1 py-2 rounded-xl transition ${
                  editTab === 'SALARY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                💰 Salary Structure (Admin)
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

              {editTab === 'SALARY' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Confidential Salary Master. This structure is strictly protected and consumed exclusively by the Payroll Engine.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Monthly Gross CTC (₹)</label>
                      <input
                        type="number"
                        value={editMonthlyGross}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditMonthlyGross(val);
                          setEditBasicSalary(Math.round(val * 0.5));
                          setEditHra(Math.round(val * 0.25));
                          setEditSpecialAllowance(Math.max(0, val - Math.round(val * 0.75)));
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Basic Salary (₹)</label>
                      <input
                        type="number"
                        value={editBasicSalary}
                        onChange={(e) => setEditBasicSalary(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">HRA (₹)</label>
                      <input
                        type="number"
                        value={editHra}
                        onChange={(e) => setEditHra(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Special Allowance (₹)</label>
                      <input
                        type="number"
                        value={editSpecialAllowance}
                        onChange={(e) => setEditSpecialAllowance(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Conveyance Allowance (₹)</label>
                      <input
                        type="number"
                        value={editConveyanceAllowance}
                        onChange={(e) => setEditConveyanceAllowance(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Statutory & Deductions */}
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Provident Fund (PF)</label>
                      <select
                        value={editPfEnabled ? editPfType : 'EXEMPT'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'EXEMPT') {
                            setEditPfEnabled(false);
                            setEditPfType('EXEMPT');
                          } else {
                            setEditPfEnabled(true);
                            setEditPfType(val as any);
                          }
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none"
                      >
                        <option value="PERCENTAGE">12% of Basic (Standard)</option>
                        <option value="FIXED">Fixed ₹1,800 Capped</option>
                        <option value="EXEMPT">Exempt / Not Applicable</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Professional Tax (PT)</label>
                      <select
                        value={editPtEnabled ? 'ENABLED' : 'EXEMPT'}
                        onChange={(e) => setEditPtEnabled(e.target.value === 'ENABLED')}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none"
                      >
                        <option value="ENABLED">Maharashtra Standard Slab (₹200/mo)</option>
                        <option value="EXEMPT">Exempt</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Monthly TDS Deduction (₹)</label>
                      <input
                        type="number"
                        value={editTdsMonthly}
                        onChange={(e) => setEditTdsMonthly(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={editBankName}
                        onChange={(e) => setEditBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Account Number</label>
                      <input
                        type="text"
                        value={editAccountNumber}
                        onChange={(e) => setEditAccountNumber(e.target.value)}
                        placeholder="e.g. 50100234567890"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={editIfscCode}
                        onChange={(e) => setEditIfscCode(e.target.value)}
                        placeholder="e.g. HDFC0001234"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono uppercase focus:bg-white focus:outline-none"
                      />
                    </div>
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
                  {editLoading ? 'Saving Changes...' : 'Save Profile & Salary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 3: ONBOARD EMPLOYEE MODAL (WITH MANDATORY JOINING DATE & SALARY)
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
                Provision workforce credentials, mandatory joining date, reporting hierarchy & salary master.
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
              <button
                type="button"
                onClick={() => setNewOnboardTab('SALARY')}
                className={`flex-1 py-2 rounded-xl transition ${
                  newOnboardTab === 'SALARY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                💰 Salary Master
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

              {newOnboardTab === 'SALARY' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Confidential Salary Master. Sets the baseline for attendance muster proration and monthly slip issuance.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Monthly Gross CTC (₹)</label>
                      <input
                        type="number"
                        value={newMonthlyGross}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNewMonthlyGross(val);
                          setNewBasicSalary(Math.round(val * 0.5));
                          setNewHra(Math.round(val * 0.25));
                          setNewSpecialAllowance(Math.max(0, val - Math.round(val * 0.75)));
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Basic Salary (₹)</label>
                      <input
                        type="number"
                        value={newBasicSalary}
                        onChange={(e) => setNewBasicSalary(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">HRA (₹)</label>
                      <input
                        type="number"
                        value={newHra}
                        onChange={(e) => setNewHra(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Special Allowance (₹)</label>
                      <input
                        type="number"
                        value={newSpecialAllowance}
                        onChange={(e) => setNewSpecialAllowance(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Conveyance Allowance (₹)</label>
                      <input
                        type="number"
                        value={newConveyanceAllowance}
                        onChange={(e) => setNewConveyanceAllowance(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Statutory & Deductions */}
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Provident Fund (PF)</label>
                      <select
                        value={newPfEnabled ? newPfType : 'EXEMPT'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'EXEMPT') {
                            setNewPfEnabled(false);
                            setNewPfType('EXEMPT');
                          } else {
                            setNewPfEnabled(true);
                            setNewPfType(val as any);
                          }
                        }}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none"
                      >
                        <option value="PERCENTAGE">12% of Basic (Standard)</option>
                        <option value="FIXED">Fixed ₹1,800 Capped</option>
                        <option value="EXEMPT">Exempt / Not Applicable</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Professional Tax (PT)</label>
                      <select
                        value={newPtEnabled ? 'ENABLED' : 'EXEMPT'}
                        onChange={(e) => setNewPtEnabled(e.target.value === 'ENABLED')}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none"
                      >
                        <option value="ENABLED">Maharashtra Standard Slab (₹200/mo)</option>
                        <option value="EXEMPT">Exempt</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Monthly TDS Deduction (₹)</label>
                      <input
                        type="number"
                        value={newTdsMonthly}
                        onChange={(e) => setNewTdsMonthly(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={newBankName}
                        onChange={(e) => setNewBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Account Number</label>
                      <input
                        type="text"
                        value={newAccountNumber}
                        onChange={(e) => setNewAccountNumber(e.target.value)}
                        placeholder="e.g. 50100234567890"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={newIfscCode}
                        onChange={(e) => setNewIfscCode(e.target.value)}
                        placeholder="e.g. HDFC0001234"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono uppercase focus:bg-white focus:outline-none"
                      />
                    </div>
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
    </div>
  );
};
