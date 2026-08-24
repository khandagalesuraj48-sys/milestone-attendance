import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, LocationSite } from './types';
import { api } from './lib/api';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { ForcePasswordChangeScreen } from './components/ForcePasswordChangeScreen';

// Employee Components
import { PunchCard } from './components/EmployeeDashboard/PunchCard';
import { TodayShiftList } from './components/EmployeeDashboard/TodayShiftList';
import { MonthlyRegister } from './components/EmployeeDashboard/MonthlyRegister';
import { LeaveRequestCard } from './components/EmployeeDashboard/LeaveRequestCard';
import { MyProfile } from './components/EmployeeDashboard/MyProfile';
import { EmployeeMenuDrawer } from './components/EmployeeDashboard/EmployeeMenuDrawer';
import { NotificationDrawer } from './components/EmployeeDashboard/NotificationDrawer';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Admin Components
import { OperationsBoard } from './components/AdminDashboard/OperationsBoard';
import { LiveAttendanceRegister } from './components/AdminDashboard/LiveAttendanceRegister';
import { EmployeeDirectory } from './components/AdminDashboard/EmployeeDirectory';
import { CorrectionStudioModal } from './components/AdminDashboard/CorrectionStudioModal';
import { SiteManager } from './components/AdminDashboard/SiteManager';
import { AccessManager } from './components/AdminDashboard/AccessManager';
import { LeaveReviewCenter } from './components/AdminDashboard/LeaveReviewCenter';
import { SecurityCenter } from './components/AdminDashboard/SecurityCenter';
import { PolicyMaster } from './components/AdminDashboard/PolicyMaster';
import { AuditVault } from './components/AdminDashboard/AuditVault';
import { ReportsCenter } from './components/AdminDashboard/ReportsCenter';

import {
  Clock,
  Calendar,
  FileSpreadsheet,
  Users,
  MapPin,
  ShieldAlert,
  Shield,
  FileText,
  BarChart3,
  Layers,
  ChevronRight,
  Activity,
  Sliders,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Employee State
  const [activeSession, setActiveSession] = useState<AttendanceRecord | null>(null);
  const [todayShifts, setTodayShifts] = useState<AttendanceRecord[]>([]);
  const [autoSignOutNotice, setAutoSignOutNotice] = useState<any>(null);
  const [empActiveTab, setEmpActiveTab] = useState<'SHIFT' | 'HISTORY' | 'LEAVE' | 'PROFILE'>('SHIFT');
  const [isEmployeeMenuOpen, setIsEmployeeMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Admin State
  const [adminActiveTab, setAdminActiveTab] = useState<
    'DASHBOARD' | 'REGISTER' | 'EMPLOYEES' | 'SITES' | 'ACCESS' | 'LEAVES' | 'SECURITY' | 'POLICY' | 'AUDIT' | 'REPORTS'
  >('DASHBOARD');
  const [adminSummary, setAdminSummary] = useState<Record<string, number>>({});
  const [adminTodayDate, setAdminTodayDate] = useState<string>('');
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Reset System State Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  // Common Data
  const [locations, setLocations] = useState<LocationSite[]>([]);

  // Hash-based client-side routing & history management
  const getEmpTabFromHash = (hash: string): 'SHIFT' | 'HISTORY' | 'LEAVE' | 'PROFILE' => {
    const clean = hash.replace(/^#\/?/, '').toLowerCase();
    if (clean === 'register' || clean === 'history') return 'HISTORY';
    if (clean === 'leave' || clean === 'leaves') return 'LEAVE';
    if (clean === 'profile') return 'PROFILE';
    return 'SHIFT';
  };

  const getEmpHashFromTab = (tab: string): string => {
    switch (tab) {
      case 'HISTORY': return '#/register';
      case 'LEAVE': return '#/leave';
      case 'PROFILE': return '#/profile';
      case 'SHIFT':
      default: return '#/shift';
    }
  };

  const getAdminTabFromHash = (hash: string): any => {
    const clean = hash.replace(/^#\/?(admin\/)?/, '').toLowerCase();
    const map: Record<string, string> = {
      dashboard: 'DASHBOARD',
      register: 'REGISTER',
      employees: 'EMPLOYEES',
      sites: 'SITES',
      access: 'ACCESS',
      leaves: 'LEAVES',
      security: 'SECURITY',
      policy: 'POLICY',
      audit: 'AUDIT',
      reports: 'REPORTS',
    };
    return map[clean] || 'DASHBOARD';
  };

  const getAdminHashFromTab = (tab: string): string => {
    return `#/admin/${tab.toLowerCase()}`;
  };

  const handleSelectEmpTab = (tab: 'SHIFT' | 'HISTORY' | 'LEAVE' | 'PROFILE', pushHistory = true) => {
    setEmpActiveTab(tab);
    const targetHash = getEmpHashFromTab(tab);
    if (pushHistory && window.location.hash !== targetHash) {
      window.history.pushState({ empTab: tab }, '', targetHash);
    }
  };

  const handleSelectAdminTab = (tab: any, pushHistory = true) => {
    setAdminActiveTab(tab);
    const targetHash = getAdminHashFromTab(tab);
    if (pushHistory && window.location.hash !== targetHash) {
      window.history.pushState({ adminTab: tab }, '', targetHash);
    }
  };

  // Listen to popstate and hashchange
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (currentUser?.role === 'admin') {
        const tab = getAdminTabFromHash(hash);
        setAdminActiveTab(tab);
      } else {
        const tab = getEmpTabFromHash(hash);
        setEmpActiveTab(tab);
      }
    };

    if (window.location.hash) {
      handlePopState();
    }

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [currentUser?.role]);

  // Check auth session on startup
  const checkAuth = async () => {
    try {
      setAuthLoading(true);
      const res = await api.getMe();
      setCurrentUser(res.user);
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch unread notifications for employee
  const fetchUnreadCount = async () => {
    if (!currentUser || currentUser.role === 'admin' || currentUser.mustChangePassword) return;
    try {
      const res = await api.getNotifications();
      const unread = (res.notifications || []).filter((n: any) => !n.isRead).length;
      setUnreadNotificationsCount(unread);
    } catch {}
  };

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Fetch approved locations
  const fetchLocations = async () => {
    if (!currentUser || currentUser.mustChangePassword) return;
    try {
      const res = await api.getLocations();
      setLocations(res.locations || []);
    } catch (err) {
      console.error('Failed to load locations', err);
    }
  };

  useEffect(() => {
    if (currentUser && !currentUser.mustChangePassword) {
      fetchLocations();
    }
  }, [currentUser]);

  // Load Employee Data
  const loadEmployeeData = async () => {
    if (!currentUser || currentUser.mustChangePassword || currentUser.role === 'admin') return;
    try {
      const res = await api.getMyToday();
      setActiveSession(res.activeSession);
      setTodayShifts(res.todayRecord ? [res.todayRecord] : []);
    } catch (err) {
      console.error('Failed to fetch employee attendance', err);
    }
  };

  // Load Admin Data
  const loadAdminData = async () => {
    if (!currentUser || currentUser.mustChangePassword || currentUser.role !== 'admin') return;
    try {
      const res = await api.getAdminOverview();
      setAdminSummary(res.stats || {});
      setAdminTodayDate(res.date || '');
    } catch (err) {
      console.error('Failed to load admin overview', err);
    }
  };

  useEffect(() => {
    if (currentUser && !currentUser.mustChangePassword) {
      if (currentUser.role === 'admin') {
        loadAdminData();
      } else {
        loadEmployeeData();
      }
    }
  }, [currentUser, refreshTrigger]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    setCurrentUser(null);
  };

  const handleSystemPurge = async () => {
    if (resetConfirmText.trim() !== 'RESET ALL DATA') {
      setResetError('Please type exact confirmation text: RESET ALL DATA');
      return;
    }

    try {
      setIsResetting(true);
      setResetError('');
      await api.purgeAllData();
      await api.logout();
      window.location.reload();
    } catch (err: any) {
      setResetError(err.message || 'Failed to wipe system data.');
      setIsResetting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-xl">
            <Activity className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-sm font-bold tracking-widest text-slate-200 uppercase">MILESTONE ATTENDANCE</h2>
          <p className="text-xs font-mono text-slate-500">Initializing Enterprise Command Center...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // Mandatory Change Password on First Login
  if (currentUser.mustChangePassword) {
    return (
      <ForcePasswordChangeScreen
        user={currentUser}
        onPasswordChanged={(updatedUser) => {
          setCurrentUser(updatedUser);
          setRefreshTrigger((prev) => prev + 1);
        }}
        onLogout={handleLogout}
      />
    );
  }

  const adminNavItems = [
    {
      group: 'OPERATIONS',
      items: [
        { id: 'DASHBOARD', label: 'Operations Board', icon: Clock, badge: 'LIVE' },
        { id: 'REGISTER', label: 'Live Muster Register', icon: FileSpreadsheet },
        { id: 'EMPLOYEES', label: 'Staff Workforce', icon: Users },
        { id: 'SITES', label: 'Projects & Locations', icon: MapPin },
        { id: 'ACCESS', label: 'Site Access Manager', icon: Layers },
      ],
    },
    {
      group: 'LEAVE & REGULARIZATION',
      items: [
        { id: 'LEAVES', label: 'Leave & Regularization', icon: FileText },
      ],
    },
    {
      group: 'INTELLIGENCE & REPORTS',
      items: [
        { id: 'REPORTS', label: 'Monthly Muster Reports', icon: BarChart3 },
      ],
    },
    {
      group: 'GOVERNANCE & SECURITY',
      items: [
        { id: 'SECURITY', label: 'Security Radar', icon: ShieldAlert },
        { id: 'POLICY', label: 'Policy & Rules', icon: Sliders },
        { id: 'AUDIT', label: 'Audit Vault', icon: Shield },
      ],
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Authoritative Command Center Header */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onProfileClick={() => currentUser.role === 'employee' && handleSelectEmpTab('PROFILE')}
        onSelectTab={(tab) => handleSelectEmpTab(tab as any)}
        currentTab={empActiveTab}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
        onOpenEmployeeMenu={() => setIsEmployeeMenuOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        notificationsCount={unreadNotificationsCount > 0 ? unreadNotificationsCount : (autoSignOutNotice ? 1 : 0)}
      />

      {/* Employee Navigation Drawers (Mobile & Desktop) */}
      {currentUser.role !== 'admin' && (
        <>
          <EmployeeMenuDrawer
            isOpen={isEmployeeMenuOpen}
            onClose={() => setIsEmployeeMenuOpen(false)}
            user={currentUser}
            currentTab={empActiveTab}
            onSelectTab={(tab) => handleSelectEmpTab(tab)}
            onLogout={handleLogout}
          />
          <NotificationDrawer
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
            notice={autoSignOutNotice}
            user={currentUser}
            onCountUpdate={(count) => {
              setUnreadNotificationsCount(count);
              if (count === 0) setAutoSignOutNotice(null);
            }}
          />
        </>
      )}

      {/* Main Layout Container */}
      <div className="flex-1 w-full max-w-full overflow-x-hidden flex flex-col lg:flex-row">
        {currentUser.role === 'admin' ? (
          /* =========================================================================
             ADMINISTRATOR PORTAL (ENTERPRISE COMMAND CENTER)
             ========================================================================= */
          <>
            {/* Desktop Left Sidebar (Enterprise Grade) */}
            <aside
              className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col pt-16 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:pt-0 ${
                isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
              }`}
            >
              {/* Sidebar Header / Context */}
              <div className="p-4 border-b border-slate-100 hidden lg:flex items-center space-x-3">
                <div className="w-9 h-9 p-1 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0">
                  <img
                    src="/assets/branding/milestone-logo.svg"
                    alt="Milestone Consultancy"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="truncate">
                  <div className="text-xs font-extrabold text-slate-900 truncate">
                    Milestone Operations
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium truncate">
                    Enterprise Command Center
                  </div>
                </div>
              </div>

              {/* Sidebar Links */}
              <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
                {adminNavItems.map((group) => (
                  <div key={group.group} className="space-y-1">
                    <div className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      {group.group}
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = adminActiveTab === item.id;
                        return (
                          <button
                            key={item.id}
                            id={`tab-admin-${item.id.toLowerCase()}`}
                            onClick={() => {
                              handleSelectAdminTab(item.id as any);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition group cursor-pointer ${
                              isActive
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 truncate">
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-700'
                                }`}
                              />
                              <span className="truncate">{item.label}</span>
                            </div>
                            {item.badge && (
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider ${
                                  isActive
                                    ? 'bg-amber-400 text-slate-950'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Sidebar Footer Info */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
                <div className="px-2 py-2 rounded-xl bg-white border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-semibold text-slate-800">Engine Active</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">Zero Legacy Data</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Fresh System Reset</span>
                </button>
              </div>
            </aside>

            {/* Backdrop for Mobile Sidebar */}
            {isMobileMenuOpen && (
              <div
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-xs lg:hidden"
              />
            )}

            {/* Admin Content Canvas */}
            <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-x-hidden">
              <ErrorBoundary componentName="Admin Module" fallbackTitle="Unable to load content">
                {adminActiveTab === 'DASHBOARD' && (
                  <OperationsBoard
                    summary={adminSummary}
                    todayDate={adminTodayDate}
                    onRefresh={() => setRefreshTrigger((t) => t + 1)}
                  />
                )}

                {adminActiveTab === 'REGISTER' && (
                  <LiveAttendanceRegister
                    onOpenCorrection={(rec) => setCorrectingRecord(rec)}
                    refreshTrigger={refreshTrigger}
                  />
                )}

                {adminActiveTab === 'EMPLOYEES' && <EmployeeDirectory locations={locations} />}

                {adminActiveTab === 'SITES' && (
                  <SiteManager locations={locations} onRefresh={fetchLocations} />
                )}

                {adminActiveTab === 'ACCESS' && (
                  <AccessManager locations={locations} />
                )}

                {adminActiveTab === 'LEAVES' && (
                  <LeaveReviewCenter />
                )}

                {adminActiveTab === 'SECURITY' && <SecurityCenter />}

                {adminActiveTab === 'POLICY' && <PolicyMaster />}

                {adminActiveTab === 'AUDIT' && <AuditVault />}

                {adminActiveTab === 'REPORTS' && <ReportsCenter />}
              </ErrorBoundary>

              {/* Correction Studio Modal */}
              {correctingRecord && (
                <CorrectionStudioModal
                  record={correctingRecord}
                  onClose={() => setCorrectingRecord(null)}
                  onSuccess={() => {
                    setRefreshTrigger((t) => t + 1);
                  }}
                />
              )}

              {/* System Reset Confirmation Modal */}
              {isResetModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
                    <div className="flex items-center space-x-3 text-rose-600">
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Complete Fresh System Reset</h3>
                        <p className="text-xs text-rose-600 font-medium">Irreversible Production Action</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      This will permanently purge <strong>all business data</strong> (employees, attendance sessions, punch logs, project sites, geofences, leaves, regularization records, device bindings, and audit trails) and remove all non-admin user accounts.
                    </p>

                    {resetError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                        {resetError}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Type <span className="font-mono text-rose-600">RESET ALL DATA</span> to confirm:
                      </label>
                      <input
                        type="text"
                        value={resetConfirmText}
                        onChange={(e) => setResetConfirmText(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:border-rose-500 outline-hidden"
                        placeholder="RESET ALL DATA"
                      />
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetModalOpen(false);
                          setResetConfirmText('');
                          setResetError('');
                        }}
                        className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isResetting || resetConfirmText.trim() !== 'RESET ALL DATA'}
                        onClick={handleSystemPurge}
                        className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition shadow-xs cursor-pointer flex items-center space-x-1.5"
                      >
                        {isResetting ? (
                          <span>Purging System...</span>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Confirm & Wipe Everything</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </>
        ) : (
          /* =========================================================================
             EMPLOYEE SELF-SERVICE PORTAL (FOCUSED PUNCH CARD & WORKFORCE EXPERIENCE)
             ========================================================================= */
          <main className="flex-1 w-full max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto px-3 sm:px-6 py-3.5 sm:py-6 space-y-4 overflow-x-hidden">
            {/* Desktop / Tablet Quick Switcher Bar (Hidden on Mobile) */}
            <div className="hidden sm:flex items-center justify-between gap-3 pb-1 border-b border-slate-200">
              <div className="flex items-center space-x-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-2xs text-xs font-semibold">
                <button
                  id="tab-emp-shift"
                  onClick={() => handleSelectEmpTab('SHIFT')}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center space-x-2 transition cursor-pointer ${
                    empActiveTab === 'SHIFT'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Shift & Attendance</span>
                </button>

                <button
                  id="tab-emp-register"
                  onClick={() => handleSelectEmpTab('HISTORY')}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center space-x-2 transition cursor-pointer ${
                    empActiveTab === 'HISTORY'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Monthly Register</span>
                </button>

                <button
                  id="tab-emp-leave"
                  onClick={() => handleSelectEmpTab('LEAVE')}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center space-x-2 transition cursor-pointer ${
                    empActiveTab === 'LEAVE'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Leave Requests</span>
                </button>

                <button
                  id="tab-emp-profile"
                  onClick={() => handleSelectEmpTab('PROFILE')}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center space-x-2 transition cursor-pointer ${
                    empActiveTab === 'PROFILE'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>My Profile</span>
                </button>
              </div>

              {/* Navigation Drawer Menu Button */}
              <button
                type="button"
                onClick={() => setIsEmployeeMenuOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <span>Menu</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Mobile View Active Sub-view Header with Return to Shift Button */}
            {empActiveTab !== 'SHIFT' && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {empActiveTab === 'HISTORY' && '📅 Monthly Register'}
                  {empActiveTab === 'LEAVE' && '📄 Leave Requests'}
                  {empActiveTab === 'PROFILE' && '👤 My Profile'}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectEmpTab('SHIFT')}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100 flex items-center space-x-1 cursor-pointer transition"
                >
                  <span>&larr; Return to Shift</span>
                </button>
              </div>
            )}

            {/* Employee Tab Content */}
            {empActiveTab === 'SHIFT' && (
              <ErrorBoundary
                componentName="Shift & Attendance (PunchCard)"
                fallbackTitle="Unable to load content"
                fallbackMessage="The Shift & Attendance module encountered an unexpected issue. Please retry or reload."
                onReset={loadEmployeeData}
              >
                <div className="w-full">
                  <PunchCard
                    user={currentUser}
                    activeSession={activeSession}
                    todayShifts={todayShifts}
                    onAttendanceUpdate={loadEmployeeData}
                    locations={locations}
                  />
                </div>
              </ErrorBoundary>
            )}

            {empActiveTab === 'HISTORY' && (
              <ErrorBoundary
                componentName="Monthly Register"
                fallbackTitle="Unable to load content"
                fallbackMessage="The Monthly Register module could not load. Please retry."
              >
                <MonthlyRegister />
              </ErrorBoundary>
            )}

            {empActiveTab === 'LEAVE' && (
              <ErrorBoundary
                componentName="Leave Requests"
                fallbackTitle="Unable to load content"
                fallbackMessage="The Leave Requests module could not load. Please retry."
              >
                <LeaveRequestCard />
              </ErrorBoundary>
            )}

            {empActiveTab === 'PROFILE' && (
              <ErrorBoundary
                componentName="My Profile"
                fallbackTitle="Unable to load content"
                fallbackMessage="The Profile module could not load. Please retry."
              >
                <MyProfile user={currentUser} onUserUpdated={(u) => setCurrentUser(u)} />
              </ErrorBoundary>
            )}
          </main>
        )}
      </div>

      {/* Corporate Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <div className="font-bold text-slate-800 tracking-tight">Milestone Consultancy</div>
          <div className="text-[11px] text-slate-400 font-medium">Build by Suraj Khandagale</div>
        </div>
      </footer>
    </div>
  );
}
