import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, LocationSite } from './types';
import { api } from './lib/api';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { ForcePasswordChangeScreen } from './components/ForcePasswordChangeScreen';

// Employee Components
import { PunchCard } from './components/EmployeeDashboard/PunchCard';
import { AutoSignOutNotice } from './components/EmployeeDashboard/AutoSignOutNotice';
import { TodayShiftList } from './components/EmployeeDashboard/TodayShiftList';
import { MonthlyRegister } from './components/EmployeeDashboard/MonthlyRegister';
import { LeaveRequestCard } from './components/EmployeeDashboard/LeaveRequestCard';
import { MySalarySlips } from './components/EmployeeDashboard/MySalarySlips';
import { MyProfile } from './components/EmployeeDashboard/MyProfile';
import { TeamFeedWidget } from './components/EmployeeDashboard/TeamFeedWidget';
import { EmployeeMenuDrawer } from './components/EmployeeDashboard/EmployeeMenuDrawer';
import { NotificationDrawer } from './components/EmployeeDashboard/NotificationDrawer';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Admin Components
import { OperationsBoard } from './components/AdminDashboard/OperationsBoard';
import { LiveAttendanceRegister } from './components/AdminDashboard/LiveAttendanceRegister';
import { PayrollEngine } from './components/AdminDashboard/PayrollEngine';
import { EmployeeDirectory } from './components/AdminDashboard/EmployeeDirectory';
import { CorrectionStudioModal } from './components/AdminDashboard/CorrectionStudioModal';
import { SiteManager } from './components/AdminDashboard/SiteManager';
import { AccessManager } from './components/AdminDashboard/AccessManager';
import { LeaveReviewCenter } from './components/AdminDashboard/LeaveReviewCenter';
import { HolidayManager } from './components/AdminDashboard/HolidayManager';
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
  Banknote,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Employee State
  const [activeSession, setActiveSession] = useState<AttendanceRecord | null>(null);
  const [todayShifts, setTodayShifts] = useState<AttendanceRecord[]>([]);
  const [autoSignOutNotice, setAutoSignOutNotice] = useState<any>(null);
  const [empActiveTab, setEmpActiveTab] = useState<'SHIFT' | 'HISTORY' | 'SLIPS' | 'LEAVE' | 'PROFILE' | 'TEAM_HIGHLIGHTS'>('SHIFT');
  const [isEmployeeMenuOpen, setIsEmployeeMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Admin State
  const [adminActiveTab, setAdminActiveTab] = useState<
    'DASHBOARD' | 'REGISTER' | 'PAYROLL' | 'EMPLOYEES' | 'SITES' | 'ACCESS' | 'LEAVES' | 'HOLIDAYS' | 'SECURITY' | 'POLICY' | 'AUDIT' | 'REPORTS'
  >('DASHBOARD');
  const [adminSummary, setAdminSummary] = useState<Record<string, number>>({});
  const [adminTodayDate, setAdminTodayDate] = useState<string>('');
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Common Data
  const [locations, setLocations] = useState<LocationSite[]>([]);

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
      setTodayShifts(res.shifts || []);
      setAutoSignOutNotice(res.recentAutoSignOutNotice);
    } catch (err) {
      console.error('Failed to fetch employee attendance', err);
    }
  };

  // Load Admin Data
  const loadAdminData = async () => {
    if (!currentUser || currentUser.mustChangePassword || currentUser.role !== 'admin') return;
    try {
      const res = await api.getAdminOverview();
      setAdminSummary(res.summary || {});
      setAdminTodayDate(res.todayDate || '');
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
        { id: 'PAYROLL', label: 'Payroll & Salary Slips', icon: Banknote, badge: 'PRO' },
        { id: 'EMPLOYEES', label: 'Staff Workforce', icon: Users },
        { id: 'SITES', label: 'Projects & Locations', icon: MapPin },
        { id: 'ACCESS', label: 'Site Access Manager', icon: Layers },
      ],
    },
    {
      group: 'LEAVE & REGULARIZATION',
      items: [
        { id: 'LEAVES', label: 'Leave & Regularization', icon: FileText },
        { id: 'HOLIDAYS', label: 'Company Holidays', icon: Calendar },
      ],
    },
    {
      group: 'INTELLIGENCE & REPORTS',
      items: [
        { id: 'REPORTS', label: 'Monthly Reports', icon: BarChart3 },
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
        onProfileClick={() => currentUser.role === 'employee' && setEmpActiveTab('PROFILE')}
        onSelectTab={(tab) => setEmpActiveTab(tab)}
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
            onSelectTab={(tab) => setEmpActiveTab(tab)}
            onLogout={handleLogout}
            siteName="RCL • WALSHIND"
          />
          <NotificationDrawer
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
            notice={autoSignOutNotice}
            user={currentUser}
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
                              setAdminActiveTab(item.id as any);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition group ${
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
              <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                <div className="px-2 py-2 rounded-xl bg-white border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-semibold text-slate-800">Engine Active</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">v2.4 IST</span>
                </div>
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

                {adminActiveTab === 'PAYROLL' && <PayrollEngine />}

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

                {adminActiveTab === 'HOLIDAYS' && (
                  <HolidayManager />
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
                  onClick={() => setEmpActiveTab('SHIFT')}
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
                  onClick={() => setEmpActiveTab('HISTORY')}
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
                  id="tab-emp-slips"
                  onClick={() => setEmpActiveTab('SLIPS')}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center space-x-2 transition cursor-pointer ${
                    empActiveTab === 'SLIPS'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Salary Slips</span>
                </button>

                <button
                  id="tab-emp-leave"
                  onClick={() => setEmpActiveTab('LEAVE')}
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
                  onClick={() => setEmpActiveTab('PROFILE')}
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
                  {empActiveTab === 'SLIPS' && '💵 Salary Slips'}
                  {empActiveTab === 'LEAVE' && '📄 Leave Requests'}
                  {empActiveTab === 'PROFILE' && '👤 My Profile'}
                  {empActiveTab === 'TEAM_HIGHLIGHTS' && '🌟 Team Highlights'}
                </span>
                <button
                  type="button"
                  onClick={() => setEmpActiveTab('SHIFT')}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100 flex items-center space-x-1 cursor-pointer transition"
                >
                  <span>&larr; Return to Shift</span>
                </button>
              </div>
            )}

            {/* Employee Tab Content Wrapped in Component-Level Error Boundaries */}
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

            {empActiveTab === 'SLIPS' && (
              <ErrorBoundary
                componentName="Salary Slips"
                fallbackTitle="Unable to load content"
                fallbackMessage="The Salary Slips module could not load. Please retry."
              >
                <MySalarySlips />
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

            {empActiveTab === 'TEAM_HIGHLIGHTS' && (
              <ErrorBoundary
                componentName="Team Highlights"
                fallbackTitle="Unable to load content"
                fallbackMessage="The Team Highlights module could not load. Please retry."
              >
                <TeamFeedWidget user={currentUser} />
              </ErrorBoundary>
            )}
          </main>
        )}
      </div>

      {/* Clean Professional Corporate Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <div className="font-bold text-slate-800 tracking-tight">Milestone Consultancy</div>
          <div className="text-[11px] text-slate-400 font-medium">Build by Suraj Khandagale</div>
        </div>
      </footer>
    </div>
  );
}
