import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { AttendanceRecord, Site, LocationSite, Employee } from '../../types';
import {
  Users,
  UserCheck,
  Clock,
  LogOut,
  Sun,
  AlertTriangle,
  Moon,
  Sparkles,
  RefreshCw,
  Building2,
  MapPin,
  Filter,
  X,
  ChevronRight,
  User,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Search,
} from 'lucide-react';

interface OperationsBoardProps {
  summary: Record<string, number>;
  todayDate: string;
  onRefresh: () => void;
}

type DrillDownModalType =
  | null
  | 'TOTAL_STAFF'
  | 'PRESENT_TODAY'
  | 'WORKING_NOW'
  | 'LATE_MARKS'
  | 'EXTRA_NIGHTS'
  | 'AUTO_SIGNOUTS';

export const OperationsBoard: React.FC<OperationsBoardProps> = ({ summary, todayDate, onRefresh }) => {
  // State for Overview API response
  const [boardData, setBoardData] = useState<{
    summary: Record<string, number>;
    siteBreakdowns: any[];
    todayRecords: AttendanceRecord[];
    allEmployees: Employee[];
    allSites: Site[];
    allLocations: LocationSite[];
  }>({
    summary,
    siteBreakdowns: [],
    todayRecords: [],
    allEmployees: [],
    allSites: [],
    allLocations: [],
  });

  const [loading, setLoading] = useState(false);

  // Reusable Dashboard Filters
  const [filterSiteId, setFilterSiteId] = useState('ALL');
  const [filterLocationId, setFilterLocationId] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterDate, setFilterDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Active Drill-down Modal State
  const [activeModal, setActiveModal] = useState<DrillDownModalType>(null);
  const [selectedSiteInModal, setSelectedSiteInModal] = useState<string>('ALL');
  const [drillDownSearch, setDrillDownSearch] = useState<string>('');
  const [selectedEmployeeForView, setSelectedEmployeeForView] = useState<Employee | null>(null);

  // Cloud Scheduler triggers
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
  const [schedulerOutput, setSchedulerOutput] = useState<string | null>(null);

  // Fetch full overview data based on active filters
  const fetchBoardOverview = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminOverview({
        date: filterDate,
        siteId: filterSiteId !== 'ALL' ? filterSiteId : undefined,
        locationId: filterLocationId !== 'ALL' ? filterLocationId : undefined,
        department: filterDepartment !== 'ALL' ? filterDepartment : undefined,
      });
      if (res.success) {
        setBoardData({
          summary: res.summary || {},
          siteBreakdowns: res.siteBreakdowns || [],
          todayRecords: res.todayRecords || [],
          allEmployees: res.allEmployees || [],
          allSites: res.allSites || [],
          allLocations: res.allLocations || [],
        });
      }
    } catch (err) {
      console.error('Failed to load operations board data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardOverview();
  }, [filterDate, filterSiteId, filterLocationId, filterDepartment]);

  // Handle Cloud Scheduler Simulation
  const handleRunScheduler = async (type: 'DAY' | 'NIGHT') => {
    try {
      setTriggerLoading(type);
      setSchedulerOutput(null);
      let res;
      if (type === 'DAY') {
        res = await api.triggerSchedulerDay();
      } else {
        res = await api.triggerSchedulerNight();
      }
      setSchedulerOutput(
        `Executed ${res.worker}: ${res.modifiedCount} open session(s) updated to AUTO_SIGNED_OUT (PRESENT_HALF_DAY).`
      );
      fetchBoardOverview();
      onRefresh();
    } catch (err: any) {
      setSchedulerOutput(`Scheduler Error: ${err.message}`);
    } finally {
      setTriggerLoading(null);
    }
  };

  // Helper formatting functions
  const formatISTTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const calculateElapsedMinutes = (signInTime?: string) => {
    if (!signInTime) return 0;
    const diff = Date.now() - new Date(signInTime).getTime();
    return Math.max(0, Math.floor(diff / 60000));
  };

  const formatHoursAndMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const currSummary = boardData.summary || summary;

  // Filter locations list for filter dropdown
  const filteredLocOptions =
    filterSiteId === 'ALL'
      ? boardData.allLocations
      : boardData.allLocations.filter((l) => l.siteId === filterSiteId);

  // Departments list
  const departmentsList = Array.from(
    new Set(boardData.allEmployees.map((e) => e.department).filter(Boolean))
  );

  return (
    <div id="admin-operations-board" className="space-y-6">
      {/* -------------------------------------------------------------
          DASHBOARD FILTER TOOLBAR
          ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Workforce Operations Filter</h3>
            <span className="text-[11px] font-mono text-slate-500">
              (Live Synchronized • {boardData.allSites.length} Sites, {boardData.allLocations.length} Geofences)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {(filterSiteId !== 'ALL' || filterLocationId !== 'ALL' || filterDepartment !== 'ALL') && (
              <button
                onClick={() => {
                  setFilterSiteId('ALL');
                  setFilterLocationId('ALL');
                  setFilterDepartment('ALL');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition"
              >
                <X className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}

            <button
              onClick={() => {
                fetchBoardOverview();
                onRefresh();
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center space-x-1.5 transition"
              title="Refresh Operations Board"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Filter 1: Project / Site */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Project / Site</label>
            <select
              id="filter-dashboard-site"
              value={filterSiteId}
              onChange={(e) => {
                setFilterSiteId(e.target.value);
                setFilterLocationId('ALL');
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            >
              <option value="ALL">All Projects & Sites ({boardData.allSites.length})</option>
              {boardData.allSites.map((s) => (
                <option key={s.siteId} value={s.siteId}>
                  {s.siteName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Attendance Location */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Attendance Location</label>
            <select
              id="filter-dashboard-location"
              value={filterLocationId}
              onChange={(e) => setFilterLocationId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            >
              <option value="ALL">All Locations ({filteredLocOptions.length})</option>
              {filteredLocOptions.map((l) => (
                <option key={l.locationId || l.id} value={l.locationId || l.id}>
                  {l.locationName || l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Department */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Department</label>
            <select
              id="filter-dashboard-department"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            >
              <option value="ALL">All Departments</option>
              {departmentsList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 4: Date */}
          <div>
            <label className="block text-slate-600 font-semibold mb-1">Date</label>
            <input
              type="date"
              id="filter-dashboard-date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          EXECUTIVE METRICS CARDS (CLICKABLE FOR FULL DRILL-DOWNS)
          ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* CARD 1: TOTAL STAFF */}
        <div
          id="card-metric-total-staff"
          onClick={() => {
            setActiveModal('TOTAL_STAFF');
            setSelectedSiteInModal('ALL');
            setDrillDownSearch('');
          }}
          className="group relative bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-slate-400 p-4 rounded-2xl shadow-xs cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Staff</span>
            <Users className="w-4 h-4 text-slate-500 group-hover:text-slate-900 transition" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1.5">
            {currSummary.totalStaff || currSummary.totalEmployees || 0}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>{currSummary.activeStaff || currSummary.activeHeadcount || 0} Active Staff</span>
            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-600 transition" />
          </div>
        </div>

        {/* CARD 2: PRESENT TODAY */}
        <div
          id="card-metric-present-today"
          onClick={() => {
            setActiveModal('PRESENT_TODAY');
            setSelectedSiteInModal('ALL');
            setDrillDownSearch('');
          }}
          className="group relative bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 p-4 rounded-2xl shadow-xs cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Present Today</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-950 mt-1.5">
            {currSummary.presentToday || currSummary.presentStaff || 0}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>
              {currSummary.workingNow || currSummary.currentlyOnDuty || 0} Active, {currSummary.completedToday || currSummary.signedOut || 0} Closed
            </span>
            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-600 transition" />
          </div>
        </div>

        {/* CARD 3: WORKING NOW */}
        <div
          id="card-metric-working-now"
          onClick={() => {
            setActiveModal('WORKING_NOW');
            setSelectedSiteInModal('ALL');
            setDrillDownSearch('');
          }}
          className="group relative bg-white hover:bg-amber-50/40 border border-slate-200 hover:border-amber-300 p-4 rounded-2xl shadow-xs cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Working Now</span>
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-900 mt-1.5">
            {currSummary.workingNow || currSummary.currentlyOnDuty || 0}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>{currSummary.completedToday || currSummary.signedOut || 0} Signed Out</span>
            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-amber-600 transition" />
          </div>
        </div>

        {/* CARD 4: LATE MARKS */}
        <div
          id="card-metric-late-marks"
          onClick={() => {
            setActiveModal('LATE_MARKS');
            setSelectedSiteInModal('ALL');
            setDrillDownSearch('');
          }}
          className="group relative bg-white hover:bg-rose-50/40 border border-slate-200 hover:border-rose-300 p-4 rounded-2xl shadow-xs cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Late Marks</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-900 mt-1.5">
            {currSummary.lateMarks || currSummary.lateCount || 0}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>After 08:30 / 19:30</span>
            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-rose-600 transition" />
          </div>
        </div>

        {/* CARD 5: EXTRA NIGHTS */}
        <div
          id="card-metric-extra-nights"
          onClick={() => {
            setActiveModal('EXTRA_NIGHTS');
            setSelectedSiteInModal('ALL');
            setDrillDownSearch('');
          }}
          className="group relative bg-white hover:bg-purple-50/40 border border-slate-200 hover:border-purple-300 p-4 rounded-2xl shadow-xs cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Extra Nights</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-900 mt-1.5">
            {currSummary.extraNights || currSummary.extraNightCount || 0}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Double Shift Work</span>
            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-purple-600 transition" />
          </div>
        </div>

        {/* CARD 6: AUTO SIGN-OUTS */}
        <div
          id="card-metric-auto-signouts"
          onClick={() => {
            setActiveModal('AUTO_SIGNOUTS');
            setSelectedSiteInModal('ALL');
            setDrillDownSearch('');
          }}
          className="group relative bg-white hover:bg-sky-50/40 border border-slate-200 hover:border-sky-300 p-4 rounded-2xl shadow-xs cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Auto Sign-Outs</span>
            <LogOut className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-900 mt-1.5">
            {currSummary.autoSignedOut || currSummary.autoSignedOutToday || 0}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Half Day Applied</span>
            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-sky-600 transition" />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          PROJECT & SITE SUMMARY MATRIX (OPERATIONAL RADAR)
          ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-slate-800" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Project & Multi-Site Operational Breakdown
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live multi-location workforce metrics categorized per construction project site
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boardData.siteBreakdowns.map((site) => (
            <div
              key={site.siteId}
              onClick={() => {
                setActiveModal('TOTAL_STAFF');
                setSelectedSiteInModal(site.siteId);
              }}
              className="p-5 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 transition cursor-pointer space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{site.siteName}</h4>
                  <span className="font-mono text-[10px] text-slate-500">{site.siteId}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    site.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {site.isActive ? 'Active Site' : 'Inactive'}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold">Assigned Staff</div>
                  <div className="text-sm font-bold font-mono text-slate-900">{site.activeStaff}</div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-emerald-700 font-semibold">Present Today</div>
                  <div className="text-sm font-bold font-mono text-emerald-800">{site.presentToday}</div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <div className="text-[10px] text-amber-700 font-semibold">Working Now</div>
                  <div className="text-sm font-bold font-mono text-amber-800">{site.workingNow}</div>
                </div>
              </div>

              {/* Sub-Locations count & Details trigger */}
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span className="flex items-center space-x-1 text-[11px]">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>{(site.locations || []).length} Active Attendance Location(s)</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-900 flex items-center space-x-0.5">
                  <span>View Staff</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          CLOUD SCHEDULER SIMULATION DECK
          ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
                GCP Cloud Scheduler & Shift Cutoff Automation
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                OIDC Authenticated
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Production Cron: Day auto-sign-out at 01:00 AM IST | Night auto-sign-out at 08:00 AM IST
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="btn-trigger-day-scheduler"
              onClick={() => handleRunScheduler('DAY')}
              disabled={!!triggerLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center space-x-2 transition disabled:opacity-50"
            >
              <Sun className="w-4 h-4 text-amber-600" />
              <span>{triggerLoading === 'DAY' ? 'Executing 01:00 AM Cutoff...' : 'Trigger 01:00 AM Day Cutoff'}</span>
            </button>

            <button
              id="btn-trigger-night-scheduler"
              onClick={() => handleRunScheduler('NIGHT')}
              disabled={!!triggerLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center space-x-2 transition disabled:opacity-50"
            >
              <Moon className="w-4 h-4 text-indigo-600" />
              <span>{triggerLoading === 'NIGHT' ? 'Executing 08:00 AM Cutoff...' : 'Trigger 08:00 AM Night Cutoff'}</span>
            </button>
          </div>
        </div>

        {schedulerOutput && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{schedulerOutput}</span>
          </div>
        )}
      </div>

      {/* =============================================================
          MODAL 1: TOTAL STAFF WORKFORCE DRILL-DOWN
          Level 1: Project / Site Summary -> Level 2: Project Staff Directory
          ============================================================= */}
      {activeModal === 'TOTAL_STAFF' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Workforce Structure & Staff Directory</h3>
                <p className="text-xs text-slate-500">
                  {selectedSiteInModal === 'ALL'
                    ? `Total Workforce: ${boardData.allEmployees.length} Staff across all Projects`
                    : `Project Staff Directory for: ${
                        boardData.allSites.find((s) => s.siteId === selectedSiteInModal)?.siteName || selectedSiteInModal
                      }`}
                </p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Site Level 1 Filter Pills */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedSiteInModal('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedSiteInModal === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Projects ({boardData.allEmployees.length})
              </button>

              {boardData.siteBreakdowns.map((s) => (
                <button
                  key={s.siteId}
                  onClick={() => setSelectedSiteInModal(s.siteId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedSiteInModal === s.siteId
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {s.siteName}: <span className="font-mono">{s.activeStaff} Staff</span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-200 flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by Name, Employee ID, Department, Designation..."
                value={drillDownSearch}
                onChange={(e) => setDrillDownSearch(e.target.value)}
                className="w-full text-xs text-slate-900 bg-transparent border-none focus:outline-none"
              />
            </div>

            {/* Staff Directory Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const filteredStaff = boardData.allEmployees.filter((emp) => {
                  if (selectedSiteInModal !== 'ALL' && !(emp.assignedSiteIds || []).includes(selectedSiteInModal)) {
                    return false;
                  }
                  if (drillDownSearch.trim()) {
                    const q = drillDownSearch.toLowerCase();
                    return (
                      emp.fullName.toLowerCase().includes(q) ||
                      emp.employeeId.toLowerCase().includes(q) ||
                      (emp.department || '').toLowerCase().includes(q) ||
                      (emp.designation || '').toLowerCase().includes(q)
                    );
                  }
                  return true;
                });

                if (filteredStaff.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No employees match the selected project/site criteria.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="pb-3 px-2">Employee</th>
                        <th className="pb-3 px-2">Department & Role</th>
                        <th className="pb-3 px-2">Assigned Project(s)</th>
                        <th className="pb-3 px-2">Today's State</th>
                        <th className="pb-3 px-2">Status</th>
                        <th className="pb-3 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStaff.map((emp) => {
                        const todayRec = boardData.todayRecords.find((r) => r.employeeId === emp.employeeId);
                        const assignedSitesList = (emp.assignedSiteIds || [])
                          .map((id) => boardData.allSites.find((s) => s.siteId === id)?.siteName || id)
                          .join(', ');

                        return (
                          <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-2">
                              <div className="font-bold text-slate-900">{emp.fullName}</div>
                              <div className="font-mono text-[10px] text-slate-500">{emp.employeeId}</div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="font-medium text-slate-800">{emp.department}</div>
                              <div className="text-[11px] text-slate-500">{emp.designation}</div>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-slate-700 font-medium truncate max-w-xs block">
                                {assignedSitesList || 'No Sites'}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              {todayRec ? (
                                <div>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      todayRec.sessionStatus === 'OPEN'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {todayRec.sessionStatus === 'OPEN' ? 'Working (Signed In)' : 'Completed Shift'}
                                  </span>
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    {todayRec.locationNameSnapshot || 'Site'} • {formatISTTime(todayRec.signInTime)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">Not Present Today</span>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  emp.accountStatus === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {emp.accountStatus || 'ACTIVE'}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <button
                                onClick={() => setSelectedEmployeeForView(emp)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold transition"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 2: PRESENT TODAY WORKFORCE
          ============================================================= */}
      {activeModal === 'PRESENT_TODAY' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Today's Present Workforce</h3>
                <p className="text-xs text-slate-500">
                  {boardData.todayRecords.length} workforce members recorded on site for {filterDate}
                </p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter by Project / Site */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedSiteInModal('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedSiteInModal === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Projects ({boardData.todayRecords.length})
              </button>

              {boardData.siteBreakdowns.map((s) => (
                <button
                  key={s.siteId}
                  onClick={() => setSelectedSiteInModal(s.siteId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedSiteInModal === s.siteId
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {s.siteName}: <span className="font-mono">{s.presentToday} Present</span>
                </button>
              ))}
            </div>

            {/* Records Table */}
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const filtered = boardData.todayRecords.filter((r) => {
                  if (selectedSiteInModal !== 'ALL' && r.siteId !== selectedSiteInModal) return false;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No attendance records found for this selection.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="pb-3 px-2">Employee</th>
                        <th className="pb-3 px-2">Project & Location Snapshot</th>
                        <th className="pb-3 px-2">Shift</th>
                        <th className="pb-3 px-2">Sign In</th>
                        <th className="pb-3 px-2">Sign Out</th>
                        <th className="pb-3 px-2">Duration</th>
                        <th className="pb-3 px-2">Session Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((r) => (
                        <tr key={r.recordId || r.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-2">
                            <div className="font-bold text-slate-900">{r.employeeName}</div>
                            <div className="font-mono text-[10px] text-slate-500">{r.employeeId}</div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="font-semibold text-slate-800">{r.siteNameSnapshot}</div>
                            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{r.locationNameSnapshot}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-bold font-mono">{r.shiftType}</span>
                            {r.isExtraShift && (
                              <span className="ml-1 text-[9px] bg-purple-100 text-purple-800 px-1 py-0.5 rounded font-semibold">
                                Extra
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 font-mono">
                            <div>{formatISTTime(r.signInTime)}</div>
                            {r.isLate && (
                              <span className="text-[10px] text-rose-600 font-semibold">Late Mark</span>
                            )}
                          </td>
                          <td className="py-3 px-2 font-mono">{formatISTTime(r.signOutTime)}</td>
                          <td className="py-3 px-2 font-mono">
                            {r.sessionStatus === 'OPEN'
                              ? `${formatHoursAndMinutes(calculateElapsedMinutes(r.signInTime))} (Active)`
                              : `${formatHoursAndMinutes(r.workingMinutes || 0)}`}
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.sessionStatus === 'OPEN'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {r.sessionStatus === 'OPEN' ? 'OPEN' : 'CLOSED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 3: CURRENTLY WORKING SESSIONS
          ============================================================= */}
      {activeModal === 'WORKING_NOW' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Currently Working On Duty</h3>
                <p className="text-xs text-slate-500">Live active attendance sessions currently open</p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const openSessions = boardData.todayRecords.filter(
                  (r) => r.sessionStatus === 'OPEN' || r.attendanceState === 'SIGNED_IN'
                );

                if (openSessions.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No workforce members are currently marked working in an open session.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="pb-3 px-2">Employee</th>
                        <th className="pb-3 px-2">Project Site</th>
                        <th className="pb-3 px-2">Location Snapshot</th>
                        <th className="pb-3 px-2">Shift</th>
                        <th className="pb-3 px-2">Sign In Time</th>
                        <th className="pb-3 px-2">Elapsed Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {openSessions.map((r) => (
                        <tr key={r.recordId || r.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-2">
                            <div className="font-bold text-slate-900">{r.employeeName}</div>
                            <div className="font-mono text-[10px] text-slate-500">{r.employeeId}</div>
                          </td>
                          <td className="py-3 px-2 font-semibold text-slate-800">{r.siteNameSnapshot}</td>
                          <td className="py-3 px-2 text-slate-600 flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-600" />
                            <span>{r.locationNameSnapshot}</span>
                          </td>
                          <td className="py-3 px-2 font-bold font-mono">{r.shiftType}</td>
                          <td className="py-3 px-2 font-mono">{formatISTTime(r.signInTime)}</td>
                          <td className="py-3 px-2 font-mono text-amber-800 font-bold">
                            {formatHoursAndMinutes(calculateElapsedMinutes(r.signInTime))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 4: TODAY'S LATE MARKS
          ============================================================= */}
      {activeModal === 'LATE_MARKS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Today's Late Marks</h3>
                <p className="text-xs text-slate-500">Sign-ins recorded after the shift grace threshold (08:30 / 19:30 IST)</p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const lateRecords = boardData.todayRecords.filter((r) => r.isLate);

                if (lateRecords.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No late arrivals recorded today. All workforce members signed in on schedule!
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="pb-3 px-2">Employee</th>
                        <th className="pb-3 px-2">Project Site</th>
                        <th className="pb-3 px-2">Location Snapshot</th>
                        <th className="pb-3 px-2">Shift Type</th>
                        <th className="pb-3 px-2">Actual Sign In (IST)</th>
                        <th className="pb-3 px-2">Scheduled Grace Limit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lateRecords.map((r) => (
                        <tr key={r.recordId || r.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-2">
                            <div className="font-bold text-slate-900">{r.employeeName}</div>
                            <div className="font-mono text-[10px] text-slate-500">{r.employeeId}</div>
                          </td>
                          <td className="py-3 px-2 font-semibold text-slate-800">{r.siteNameSnapshot}</td>
                          <td className="py-3 px-2 text-slate-600">{r.locationNameSnapshot}</td>
                          <td className="py-3 px-2 font-bold font-mono">{r.shiftType}</td>
                          <td className="py-3 px-2 font-mono text-rose-700 font-bold">{formatISTTime(r.signInTime)}</td>
                          <td className="py-3 px-2 font-mono text-slate-500">
                            {r.shiftType === 'DAY' ? '08:30 AM' : '07:30 PM'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 5: EXTRA NIGHT WORK
          ============================================================= */}
      {activeModal === 'EXTRA_NIGHTS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Extra Night Shift Attendance</h3>
                <p className="text-xs text-slate-500">Overtime & double-shift night attendance sessions recorded</p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const extraNights = boardData.todayRecords.filter((r) => r.isExtraShift);

                if (extraNights.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No extra night sessions recorded for today.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="pb-3 px-2">Employee</th>
                        <th className="pb-3 px-2">Project Site</th>
                        <th className="pb-3 px-2">Location Snapshot</th>
                        <th className="pb-3 px-2">Sign In</th>
                        <th className="pb-3 px-2">Sign Out</th>
                        <th className="pb-3 px-2">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {extraNights.map((r) => (
                        <tr key={r.recordId || r.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-2">
                            <div className="font-bold text-slate-900">{r.employeeName}</div>
                            <div className="font-mono text-[10px] text-slate-500">{r.employeeId}</div>
                          </td>
                          <td className="py-3 px-2 font-semibold text-slate-800">{r.siteNameSnapshot}</td>
                          <td className="py-3 px-2 text-slate-600">{r.locationNameSnapshot}</td>
                          <td className="py-3 px-2 font-mono">{formatISTTime(r.signInTime)}</td>
                          <td className="py-3 px-2 font-mono">{formatISTTime(r.signOutTime)}</td>
                          <td className="py-3 px-2 font-mono text-purple-800 font-bold">
                            {formatHoursAndMinutes(r.workingMinutes || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 6: TODAY'S AUTO SIGN-OUTS
          ============================================================= */}
      {activeModal === 'AUTO_SIGNOUTS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Today's Auto Sign-Outs</h3>
                <p className="text-xs text-slate-500">
                  Cutoff triggered auto sign-outs penalized with PRESENT_HALF_DAY
                </p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const autoRecords = boardData.todayRecords.filter(
                  (r) => r.signOutReason === 'EMPLOYEE_FORGOT_SIGN_OUT' || r.attendanceState === 'AUTO_SIGNED_OUT'
                );

                if (autoRecords.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No automated sign-outs recorded today.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="pb-3 px-2">Employee</th>
                        <th className="pb-3 px-2">Project Site</th>
                        <th className="pb-3 px-2">Shift Type</th>
                        <th className="pb-3 px-2">Sign In</th>
                        <th className="pb-3 px-2">Auto Sign-Out Time</th>
                        <th className="pb-3 px-2">Applied Penalty Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {autoRecords.map((r) => (
                        <tr key={r.recordId || r.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-2">
                            <div className="font-bold text-slate-900">{r.employeeName}</div>
                            <div className="font-mono text-[10px] text-slate-500">{r.employeeId}</div>
                          </td>
                          <td className="py-3 px-2 font-semibold text-slate-800">{r.siteNameSnapshot}</td>
                          <td className="py-3 px-2 font-bold font-mono">{r.shiftType}</td>
                          <td className="py-3 px-2 font-mono">{formatISTTime(r.signInTime)}</td>
                          <td className="py-3 px-2 font-mono text-sky-800 font-bold">{formatISTTime(r.signOutTime)}</td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              PRESENT_HALF_DAY
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          EMPLOYEE DETAILS READ-ONLY MODAL
          ============================================================= */}
      {selectedEmployeeForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedEmployeeForView(null)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                {selectedEmployeeForView.fullName.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedEmployeeForView.fullName}</h3>
                <div className="font-mono text-xs text-slate-500">
                  {selectedEmployeeForView.employeeId} • @{selectedEmployeeForView.username}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Department</span>
                <span className="font-semibold text-slate-900">{selectedEmployeeForView.department}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Designation</span>
                <span className="font-semibold text-slate-900">{selectedEmployeeForView.designation}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Email Address</span>
                <span className="font-mono font-semibold text-slate-900">{selectedEmployeeForView.email || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Mobile</span>
                <span className="font-mono font-semibold text-slate-900">{selectedEmployeeForView.mobile || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Account Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedEmployeeForView.accountStatus === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {selectedEmployeeForView.accountStatus || 'ACTIVE'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">Authorized Project Sites</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(selectedEmployeeForView.assignedSiteIds || []).map((siteId) => {
                    const s = boardData.allSites.find((site) => site.siteId === siteId);
                    return (
                      <span key={siteId} className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] font-semibold text-slate-800">
                        {s ? s.siteName : siteId}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedEmployeeForView(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
