import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { AttendanceRecord, Site, LocationSite, Employee } from '../../types';
import { EmployeeAvatar } from '../common/EmployeeAvatar';
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
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Search,
  Activity,
  Briefcase,
  Smartphone,
  Info,
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

  const formattedDate = new Date(filterDate).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div id="admin-operations-board" className="space-y-6">
      {/* -------------------------------------------------------------
          HERO BANNER & OPERATIONAL CONTEXT
          ------------------------------------------------------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        {/* Subtle background ambient graphic */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold tracking-wider uppercase border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Operational Control</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">IST Multi-Site Sync</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Good Morning, Administrator
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Operations Overview &bull; <span className="font-semibold text-amber-400">{formattedDate}</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                fetchBoardOverview();
                onRefresh();
              }}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-2 transition border border-slate-700 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          DASHBOARD FILTER TOOLBAR
          ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Operations Filter & Scope</h3>
            <span className="text-[11px] font-mono text-slate-500">
              ({boardData.allSites.length} Sites, {boardData.allLocations.length} Geofences Active)
            </span>
          </div>

          {(filterSiteId !== 'ALL' || filterLocationId !== 'ALL' || filterDepartment !== 'ALL') && (
            <button
              onClick={() => {
                setFilterSiteId('ALL');
                setFilterLocationId('ALL');
                setFilterDepartment('ALL');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Filter 1: Date */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Attendance Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              />
            </div>
          </div>

          {/* Filter 2: Project Site */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Project / Site
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <select
                value={filterSiteId}
                onChange={(e) => {
                  setFilterSiteId(e.target.value);
                  setFilterLocationId('ALL');
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition appearance-none"
              >
                <option value="ALL">All Projects ({boardData.allSites.length})</option>
                {boardData.allSites.map((s) => (
                  <option key={s.siteId} value={s.siteId}>
                    {s.siteName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter 3: Geofence Location */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Geofence Location
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <select
                value={filterLocationId}
                onChange={(e) => setFilterLocationId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition appearance-none"
              >
                <option value="ALL">All Locations ({filteredLocOptions.length})</option>
                {filteredLocOptions.map((loc) => (
                  <option key={loc.locationId || loc.id} value={loc.locationId || loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filter 4: Department */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Department
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition appearance-none"
              >
                <option value="ALL">All Departments</option>
                {departmentsList.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          6 HIGH-IMPACT ENTERPRISE METRIC CARDS (INTERACTIVE DRILL-DOWN)
          ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* CARD 1: TOTAL STAFF */}
        <div
          id="card-metric-total-staff"
          onClick={() => {
            setActiveModal('TOTAL_STAFF');
            setSelectedSiteInModal('ALL');
            setDrillDownSearch('');
          }}
          className="group relative bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-400 p-4 sm:p-5 rounded-2xl shadow-2xs cursor-pointer transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Staff</span>
              <Users className="w-4 h-4 text-slate-600 group-hover:text-slate-900 transition" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 font-mono tracking-tight">
              {currSummary.totalStaff || boardData.allEmployees.length || 0}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-700">{boardData.allSites.length} Projects Active</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition text-slate-900" />
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
          className="group relative bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 p-4 sm:p-5 rounded-2xl shadow-2xs cursor-pointer transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase tracking-wider">
              <span>Present Today</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-950 mt-2 font-mono tracking-tight">
              {currSummary.presentToday || 0}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span className="font-semibold text-emerald-800">
              {currSummary.totalStaff > 0
                ? `${Math.round((currSummary.presentToday / currSummary.totalStaff) * 100)}% Turnout`
                : 'Recorded'}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition text-emerald-700" />
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
          className="group relative bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 p-4 sm:p-5 rounded-2xl shadow-2xs cursor-pointer transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-amber-700 text-xs font-bold uppercase tracking-wider">
              <span>Working Now</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-amber-950 mt-2 font-mono tracking-tight">
              {currSummary.workingNow || 0}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span className="font-semibold text-amber-800">Live Active On-Site</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition text-amber-700" />
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
          className="group relative bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-300 p-4 sm:p-5 rounded-2xl shadow-2xs cursor-pointer transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-rose-700 text-xs font-bold uppercase tracking-wider">
              <span>Late Marks</span>
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-rose-950 mt-2 font-mono tracking-tight">
              {currSummary.lateMarks || 0}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span className="font-semibold text-rose-700">Tardy Check-Ins</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition text-rose-700" />
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
          className="group relative bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 p-4 sm:p-5 rounded-2xl shadow-2xs cursor-pointer transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-indigo-700 text-xs font-bold uppercase tracking-wider">
              <span>Extra Nights</span>
              <Moon className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-950 mt-2 font-mono tracking-tight">
              {currSummary.extraNights || currSummary.extraNightCount || 0}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span className="font-semibold text-indigo-700">Double Shift Work</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition text-indigo-700" />
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
          className="group relative bg-white hover:bg-sky-50/50 border border-slate-200 hover:border-sky-300 p-4 sm:p-5 rounded-2xl shadow-2xs cursor-pointer transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-sky-700 text-xs font-bold uppercase tracking-wider">
              <span>Auto Sign-Outs</span>
              <LogOut className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-sky-950 mt-2 font-mono tracking-tight">
              {currSummary.autoSignedOut || currSummary.autoSignedOutToday || 0}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span className="font-semibold text-sky-700">Half Day Penalty</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition text-sky-700" />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          PROJECT & SITE PRESENCE MATRIX (MULTI-SITE ARCHITECTURE)
          ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-slate-800" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Project & Multi-Site Operational Breakdown
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live multi-location workforce metrics categorized per construction project site
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {boardData.siteBreakdowns.map((site) => (
            <div
              key={site.siteId}
              onClick={() => {
                setActiveModal('TOTAL_STAFF');
                setSelectedSiteInModal(site.siteId);
              }}
              className="p-5 rounded-2xl bg-slate-50/70 hover:bg-slate-100/90 border border-slate-200/80 hover:border-slate-300 transition cursor-pointer space-y-4 shadow-2xs group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-amber-600 transition">
                    {site.siteName}
                  </h4>
                  <span className="font-mono text-[11px] text-slate-500">{site.siteId}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    site.isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {site.isActive ? 'Active Site' : 'Inactive'}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Staff</div>
                  <div className="text-base font-extrabold font-mono text-slate-900 mt-0.5">
                    {site.activeStaff}
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Present</div>
                  <div className="text-base font-extrabold font-mono text-emerald-800 mt-0.5">
                    {site.presentToday}
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Working</div>
                  <div className="text-base font-extrabold font-mono text-amber-800 mt-0.5">
                    {site.workingNow}
                  </div>
                </div>
              </div>

              {/* Sub-Locations count & Details trigger */}
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{(site.locations || []).length} Geofence Locations</span>
                </span>
                <span className="text-[11px] font-bold text-slate-900 group-hover:text-amber-600 flex items-center space-x-0.5 transition">
                  <span>Inspect Staff</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------
          LIVE WORKFORCE TODAY (PROMINENT EMPLOYEE AVATARS)
          ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Live Workforce Activity ({boardData.todayRecords.length} Sessions Today)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time attendance logs with employee avatars, shift types, locations and durations
            </p>
          </div>
        </div>

        {boardData.todayRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">
            No attendance records logged for the selected scope yet.
          </div>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {boardData.todayRecords.slice(0, 15).map((rec) => {
              const isOpen = !rec.signOutTime;
              const elapsedMins = rec.workingMinutes || calculateElapsedMinutes(rec.signInTime);

              return (
                <div
                  key={rec.recordId || rec.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-2xl transition"
                >
                  <div className="flex items-center space-x-3">
                    <EmployeeAvatar
                      name={rec.employeeName || 'Staff'}
                      size="md"
                      status={
                        isOpen
                          ? 'WORKING'
                          : rec.isLate
                          ? 'LATE'
                          : rec.signOutType === 'AUTO_SIGNED_OUT' || rec.attendanceState === 'AUTO_SIGNED_OUT'
                          ? 'AUTO_SIGNED_OUT'
                          : 'PRESENT'
                      }
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {rec.employeeName || 'Staff Member'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">
                          {rec.employeeId}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                        <span className="font-semibold text-slate-700">
                          {rec.siteNameSnapshot || rec.siteId || 'Site'}
                        </span>
                        <span>&bull;</span>
                        <span>{rec.locationNameSnapshot || rec.locationId || 'Gate'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
                        rec.shiftType === 'NIGHT'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {rec.shiftType === 'NIGHT' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                      <span>{rec.shiftType} SHIFT</span>
                    </span>

                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-slate-900">
                        {formatISTTime(rec.signInTime)} {rec.signOutTime ? `→ ${formatISTTime(rec.signOutTime)}` : ''}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {isOpen ? (
                          <span className="text-emerald-700 font-bold">Live {formatHoursAndMinutes(elapsedMins)}</span>
                        ) : (
                          <span>Total {formatHoursAndMinutes(elapsedMins)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          CLOUD SCHEDULER & CUTOFF AUTOMATION DECK
          ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-wider uppercase">
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
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-2 transition disabled:opacity-50"
            >
              <Sun className="w-4 h-4 text-amber-600" />
              <span>{triggerLoading === 'DAY' ? 'Executing 01:00 AM Cutoff...' : 'Trigger 01:00 AM Day Cutoff'}</span>
            </button>

            <button
              id="btn-trigger-night-scheduler"
              onClick={() => handleRunScheduler('NIGHT')}
              disabled={!!triggerLoading}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center space-x-2 transition disabled:opacity-50"
            >
              <Moon className="w-4 h-4 text-indigo-600" />
              <span>{triggerLoading === 'NIGHT' ? 'Executing 08:00 AM Cutoff...' : 'Trigger 08:00 AM Night Cutoff'}</span>
            </button>
          </div>
        </div>

        {schedulerOutput && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{schedulerOutput}</span>
          </div>
        )}
      </div>

      {/* =============================================================
          MODAL 1: TOTAL STAFF WORKFORCE DRILL-DOWN
          ============================================================= */}
      {activeModal === 'TOTAL_STAFF' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
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
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Site Pills */}
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
                  {s.siteName} ({s.activeStaff})
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by Name, ID, Designation..."
                  value={drillDownSearch}
                  onChange={(e) => setDrillDownSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Staff List */}
            <div className="flex-1 p-6 overflow-y-auto divide-y divide-slate-100">
              {boardData.allEmployees
                .filter((emp) => {
                  const matchesSite =
                    selectedSiteInModal === 'ALL' || (emp.assignedSiteIds || []).includes(selectedSiteInModal);
                  const q = drillDownSearch.toLowerCase();
                  const matchesSearch =
                    !drillDownSearch ||
                    emp.fullName?.toLowerCase().includes(q) ||
                    emp.employeeId?.toLowerCase().includes(q) ||
                    emp.designation?.toLowerCase().includes(q);
                  return matchesSite && matchesSearch;
                })
                .map((emp) => (
                  <div key={emp.employeeId} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <EmployeeAvatar name={emp.fullName} size="md" status={emp.accountStatus === 'ACTIVE' ? 'ACTIVE' : null} />
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900">{emp.fullName}</div>
                        <div className="text-[11px] text-slate-500">
                          {emp.designation || 'Staff'} &bull; <span className="font-mono">{emp.employeeId}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedEmployeeForView(emp)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
                    >
                      View Profile
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 2: PRESENT TODAY DRILL-DOWN
          ============================================================= */}
      {activeModal === 'PRESENT_TODAY' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Present Today Workforce</h3>
                <p className="text-xs text-slate-500">
                  Total {boardData.todayRecords.length} recorded attendances for {formattedDate}
                </p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto divide-y divide-slate-100">
              {boardData.todayRecords.map((rec) => (
                <div key={rec.recordId || rec.id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <EmployeeAvatar name={rec.employeeName} size="md" status="PRESENT" />
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900">{rec.employeeName}</div>
                      <div className="text-[11px] text-slate-500">
                        {rec.siteNameSnapshot || rec.siteId} &bull; {rec.locationNameSnapshot || rec.locationId}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <div className="font-bold text-slate-900">{formatISTTime(rec.signInTime)}</div>
                    <div className="text-[10px] text-emerald-700 font-semibold">{rec.shiftType} SHIFT</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 3: WORKING NOW DRILL-DOWN
          ============================================================= */}
      {activeModal === 'WORKING_NOW' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Active Working Workforce</h3>
                <p className="text-xs text-slate-500">
                  Employees currently clocked in on construction sites
                </p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto divide-y divide-slate-100">
              {boardData.todayRecords
                .filter((r) => !r.signOutTime)
                .map((rec) => (
                  <div key={rec.recordId || rec.id} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <EmployeeAvatar name={rec.employeeName} size="md" status="WORKING" />
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900">{rec.employeeName}</div>
                        <div className="text-[11px] text-slate-500">
                          {rec.siteNameSnapshot || rec.siteId} &bull; {rec.locationNameSnapshot || rec.locationId}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-slate-900">
                        In: {formatISTTime(rec.signInTime)}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-700 font-bold">
                        {formatHoursAndMinutes(calculateElapsedMinutes(rec.signInTime))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 4: LATE MARKS DRILL-DOWN
          ============================================================= */}
      {activeModal === 'LATE_MARKS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Late Marks Breakdown</h3>
                <p className="text-xs text-slate-500">Employees clocking in after policy grace periods</p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto divide-y divide-slate-100">
              {boardData.todayRecords
                .filter((r) => r.isLate)
                .map((rec) => (
                  <div key={rec.recordId || rec.id} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <EmployeeAvatar name={rec.employeeName} size="md" status="LATE" />
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900">{rec.employeeName}</div>
                        <div className="text-[11px] text-slate-500">
                          {rec.siteNameSnapshot || rec.siteId} &bull; {rec.locationNameSnapshot || rec.locationId}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                        Late Check-In
                      </span>
                      <div className="font-mono text-xs font-bold text-slate-900 mt-1">
                        {formatISTTime(rec.signInTime)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 5: EXTRA NIGHTS DRILL-DOWN
          ============================================================= */}
      {activeModal === 'EXTRA_NIGHTS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Extra Night Shift Operations</h3>
                <p className="text-xs text-slate-500">Authorized double-shift attendance for {formattedDate}</p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto divide-y divide-slate-100">
              {boardData.todayRecords
                .filter((r) => r.isExtraShift || r.shiftType === 'NIGHT')
                .map((rec) => (
                  <div key={rec.recordId || rec.id} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <EmployeeAvatar name={rec.employeeName} size="md" status="WORKING" />
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900">{rec.employeeName}</div>
                        <div className="text-[11px] text-slate-500">
                          {rec.siteNameSnapshot || rec.siteId} &bull; {rec.locationNameSnapshot || rec.locationId}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                        Extra Night
                      </span>
                      <div className="font-mono text-xs font-bold text-slate-900 mt-1">
                        {formatISTTime(rec.signInTime)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL 6: AUTO SIGN-OUTS DRILL-DOWN
          ============================================================= */}
      {activeModal === 'AUTO_SIGNOUTS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Automated Shift Cutoffs</h3>
                <p className="text-xs text-slate-500">
                  Sessions auto-signed out by system scheduler (Half-Day Penalty applied)
                </p>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto divide-y divide-slate-100">
              {boardData.todayRecords
                .filter((r) => r.signOutType === 'AUTO_SIGNED_OUT' || r.attendanceState === 'AUTO_SIGNED_OUT')
                .map((rec) => (
                  <div key={rec.recordId || rec.id} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <EmployeeAvatar name={rec.employeeName} size="md" status="AUTO_SIGNED_OUT" />
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900">{rec.employeeName}</div>
                        <div className="text-[11px] text-slate-500">
                          {rec.siteNameSnapshot || rec.siteId} &bull; {rec.locationNameSnapshot || rec.locationId}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                        Half Day Penalty
                      </span>
                      <div className="font-mono text-[11px] text-slate-500 mt-1">
                        In: {formatISTTime(rec.signInTime)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          SUB-MODAL: EMPLOYEE FULL INSPECTION CARD
          ============================================================= */}
      {selectedEmployeeForView && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <EmployeeAvatar
                  name={selectedEmployeeForView.fullName}
                  size="lg"
                  status={selectedEmployeeForView.accountStatus === 'ACTIVE' ? 'ACTIVE' : null}
                />
                <div>
                  <h3 className="font-bold text-base text-slate-900">{selectedEmployeeForView.fullName}</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedEmployeeForView.employeeId}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployeeForView(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex justify-between">
                <span className="text-slate-500 font-semibold">Department:</span>
                <span className="font-bold text-slate-900">{selectedEmployeeForView.department}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex justify-between">
                <span className="text-slate-500 font-semibold">Designation:</span>
                <span className="font-bold text-slate-900">{selectedEmployeeForView.designation}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex justify-between">
                <span className="text-slate-500 font-semibold">Username:</span>
                <span className="font-mono text-slate-900 font-bold">{selectedEmployeeForView.username}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex justify-between">
                <span className="text-slate-500 font-semibold">Assigned Projects:</span>
                <span className="font-bold text-slate-900">
                  {(selectedEmployeeForView.assignedSiteIds || []).join(', ') || 'All Projects'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedEmployeeForView(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
            >
              Close Profile View
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
