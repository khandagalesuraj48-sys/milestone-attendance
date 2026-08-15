import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Employee, Site, LocationSite } from '../../types';
import {
  Users,
  ShieldCheck,
  Building,
  MapPin,
  Search,
  Filter,
  CheckSquare,
  Square,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';

interface AccessManagerProps {
  locations?: LocationSite[];
}

export const AccessManager: React.FC<AccessManagerProps> = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [locations, setLocations] = useState<LocationSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Multi-select state
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<'PROJECT_SITE' | 'LOCATION'>('PROJECT_SITE');
  const [targetId, setTargetId] = useState('');
  const [bulkAction, setBulkAction] = useState<'ASSIGN' | 'REMOVE'>('ASSIGN');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, siteRes, locRes] = await Promise.all([
        api.getEmployees(),
        api.getAdminSites(),
        api.getAdminLocations(),
      ]);
      setEmployees(empRes.employees || []);
      setSites(siteRes.sites || []);
      setLocations(locRes.locations || []);
      if (siteRes.sites && siteRes.sites.length > 0 && !targetId) {
        setTargetId(siteRes.sites[0].siteId);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load access records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (targetType === 'PROJECT_SITE' && sites.length > 0) {
      setTargetId(sites[0].siteId);
    } else if (targetType === 'LOCATION' && locations.length > 0) {
      setTargetId(locations[0].id);
    }
  }, [targetType, sites, locations]);

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === 'ALL' || emp.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const handleSelectAll = () => {
    if (selectedEmpIds.length === filteredEmployees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(filteredEmployees.map((e) => e.employeeId));
    }
  };

  const handleToggleEmp = (id: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkAction = async () => {
    if (selectedEmpIds.length === 0 || !targetId) {
      setStatusMessage({ type: 'error', text: 'Please select at least one employee and a target project/location.' });
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage(null);
      const res = await api.bulkAssignAccess({
        employeeIds: selectedEmpIds,
        targetType,
        targetId,
        action: bulkAction,
      });

      setStatusMessage({
        type: 'success',
        text: `Successfully ${bulkAction === 'ASSIGN' ? 'assigned' : 'removed'} access for ${res.modifiedCount} workforce member(s).`,
      });
      setSelectedEmpIds([]);
      await fetchData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update access permissions.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="access-manager-module" className="space-y-6">
      {/* Header Context */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-slate-900 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Workforce Access & Site Assignment
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized authority to grant or revoke Project Site and Geofence Location permissions
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs flex items-center space-x-2 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center space-x-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Bulk Action Command Panel */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
          <ArrowRightLeft className="w-4 h-4" />
          <span>Bulk Access Provisioning</span>
        </div>
        <p className="text-xs text-slate-300 mb-6">
          Selected members: <strong className="text-white">{selectedEmpIds.length}</strong> of{' '}
          <strong className="text-white">{filteredEmployees.length}</strong> displayed
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Action Type</label>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-amber-400 outline-hidden"
            >
              <option value="ASSIGN">Grant / Assign Access</option>
              <option value="REMOVE">Revoke / Remove Access</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Target Perimeter</label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-amber-400 outline-hidden"
            >
              <option value="PROJECT_SITE">Project Site (Hierarchy Level)</option>
              <option value="LOCATION">Geofence Location (Specific Radius)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {targetType === 'PROJECT_SITE' ? 'Select Project Site' : 'Select Location'}
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:ring-2 focus:ring-amber-400 outline-hidden"
            >
              {targetType === 'PROJECT_SITE'
                ? sites.map((s) => (
                    <option key={s.siteId} value={s.siteId}>
                      {s.siteName} ({s.siteId})
                    </option>
                  ))
                : locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.locationName} • {loc.siteId} ({loc.radiusMeters}m)
                    </option>
                  ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleExecuteBulkAction}
              disabled={submitting || selectedEmpIds.length === 0}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition shadow-md cursor-pointer ${
                bulkAction === 'ASSIGN'
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 disabled:opacity-50'
                  : 'bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-50'
              }`}
            >
              {bulkAction === 'ASSIGN' ? <Plus className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
              <span>
                {submitting
                  ? 'Applying Changes...'
                  : `${bulkAction === 'ASSIGN' ? 'Grant Access' : 'Revoke Access'} (${selectedEmpIds.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Employees Filter and Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name, ID or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-slate-900 outline-hidden"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 outline-hidden"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              {selectedEmpIds.length === filteredEmployees.length && filteredEmployees.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-slate-900" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedEmpIds.length === filteredEmployees.length && filteredEmployees.length > 0
                  ? 'Deselect All'
                  : 'Select All Filtered'}
              </span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading workforce registry...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
              No staff members found matching criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="pb-3 px-3 w-10">Select</th>
                  <th className="pb-3 px-3">Employee</th>
                  <th className="pb-3 px-3">Department & Role</th>
                  <th className="pb-3 px-3">Assigned Project Sites</th>
                  <th className="pb-3 px-3">Assigned Geofences</th>
                  <th className="pb-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedEmpIds.includes(emp.employeeId);
                  const assignedSites = emp.assignedSiteIds || [];
                  const assignedLocs = emp.assignedLocationIds || [];

                  return (
                    <tr
                      key={emp.employeeId}
                      className={`hover:bg-slate-50/80 transition cursor-pointer ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                      onClick={() => handleToggleEmp(emp.employeeId)}
                    >
                      <td className="py-3.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                        />
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{emp.fullName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{emp.employeeId}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">{emp.department || 'Operations'}</div>
                        <div className="text-[11px] text-slate-500">{emp.designation || 'Staff'}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        {assignedSites.length === 0 ? (
                          <span className="text-slate-400 italic">No specific site (All)</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {assignedSites.map((sId) => {
                              const s = sites.find((site) => site.siteId === sId);
                              return (
                                <span
                                  key={sId}
                                  className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold"
                                >
                                  {s?.siteName || sId}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        {assignedLocs.length === 0 ? (
                          <span className="text-slate-400 italic">Default site perimeters</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {assignedLocs.map((lId) => {
                              const loc = locations.find((l) => l.id === lId);
                              return (
                                <span
                                  key={lId}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold"
                                >
                                  {loc?.locationName || lId}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.accountStatus === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {emp.accountStatus || 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
