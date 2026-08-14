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
import { MyProfile } from './components/EmployeeDashboard/MyProfile';
import { TeamFeedWidget } from './components/EmployeeDashboard/TeamFeedWidget';

// Admin Components
import { OperationsBoard } from './components/AdminDashboard/OperationsBoard';
import { LiveAttendanceRegister } from './components/AdminDashboard/LiveAttendanceRegister';
import { EmployeeDirectory } from './components/AdminDashboard/EmployeeDirectory';
import { CorrectionStudioModal } from './components/AdminDashboard/CorrectionStudioModal';
import { SiteManager } from './components/AdminDashboard/SiteManager';
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
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Employee State
  const [activeSession, setActiveSession] = useState<AttendanceRecord | null>(null);
  const [todayShifts, setTodayShifts] = useState<AttendanceRecord[]>([]);
  const [autoSignOutNotice, setAutoSignOutNotice] = useState<any>(null);
  const [empActiveTab, setEmpActiveTab] = useState<'SHIFT' | 'HISTORY' | 'LEAVE' | 'PROFILE'>('SHIFT');

  // Admin State
  const [adminActiveTab, setAdminActiveTab] = useState<
    'DASHBOARD' | 'REGISTER' | 'EMPLOYEES' | 'SITES' | 'SECURITY' | 'POLICY' | 'AUDIT' | 'REPORTS'
  >('DASHBOARD');
  const [adminSummary, setAdminSummary] = useState<Record<string, number>>({});
  const [adminTodayDate, setAdminTodayDate] = useState<string>('');
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        { id: 'EMPLOYEES', label: 'Staff Workforce', icon: Users },
        { id: 'SITES', label: 'Projects & Locations', icon: MapPin },
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
        { id: 'POLICY', label: 'Policy & Rules', icon: FileText },
        { id: 'AUDIT', label: 'Audit Vault', icon: Shield },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Authoritative Command Center Header */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onProfileClick={() => currentUser.role === 'employee' && setEmpActiveTab('PROFILE')}
        onSelectTab={(tab) => setEmpActiveTab(tab)}
        currentTab={empActiveTab}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Main Layout Container */}
      <div className="flex-1 w-full flex flex-col lg:flex-row">
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
              <div className="p-4 border-b border-slate-100 hidden lg:block">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Control Navigation
                </div>
                <div className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                  Milestone Consultancy HQ
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
            <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
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

              {adminActiveTab === 'SECURITY' && <SecurityCenter />}

              {adminActiveTab === 'POLICY' && <PolicyMaster />}

              {adminActiveTab === 'AUDIT' && <AuditVault />}

              {adminActiveTab === 'REPORTS' && <ReportsCenter />}

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
             EMPLOYEE SELF-SERVICE PORTAL (CLEAN & ELEGANT WORKFORCE EXPERIENCE)
             ========================================================================= */
          <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-24 md:pb-8">
            {/* Auto Sign-Out Notification Banner */}
            <AutoSignOutNotice notice={autoSignOutNotice} />

            {/* Employee Tab Navigation Header (Desktop / Tablet) */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200">
              <div className="flex items-center space-x-1.5 p-1 bg-white border border-slate-200 rounded-2xl shadow-2xs text-xs font-semibold w-full sm:w-auto">
                <button
                  id="tab-emp-shift"
                  onClick={() => setEmpActiveTab('SHIFT')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl flex items-center justify-center space-x-2 transition ${
                    empActiveTab === 'SHIFT'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Shift & Attendance</span>
                </button>

                <button
                  id="tab-emp-register"
                  onClick={() => setEmpActiveTab('HISTORY')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl flex items-center justify-center space-x-2 transition ${
                    empActiveTab === 'HISTORY'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Monthly Register</span>
                </button>

                <button
                  id="tab-emp-leave"
                  onClick={() => setEmpActiveTab('LEAVE')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl flex items-center justify-center space-x-2 transition ${
                    empActiveTab === 'LEAVE'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Leave Requests</span>
                </button>

                <button
                  id="tab-emp-profile"
                  onClick={() => setEmpActiveTab('PROFILE')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl flex items-center justify-center space-x-2 transition ${
                    empActiveTab === 'PROFILE'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>My Profile</span>
                </button>
              </div>
            </div>

            {/* Employee Tab Content */}
            {empActiveTab === 'SHIFT' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7">
                  <PunchCard
                    user={currentUser}
                    activeSession={activeSession}
                    todayShifts={todayShifts}
                    onAttendanceUpdate={loadEmployeeData}
                    locations={locations}
                  />
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <TodayShiftList shifts={todayShifts} />
                  <TeamFeedWidget />
                </div>
              </div>
            )}

            {empActiveTab === 'HISTORY' && <MonthlyRegister />}

            {empActiveTab === 'LEAVE' && <LeaveRequestCard />}

            {empActiveTab === 'PROFILE' && (
              <MyProfile user={currentUser} onUserUpdated={(u) => setCurrentUser(u)} />
            )}

            {/* Mobile Bottom Tab Bar (App-like Experience for iPhone & Android) */}
            <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2 md:hidden shadow-lg flex items-center justify-around">
              <button
                onClick={() => setEmpActiveTab('SHIFT')}
                className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  empActiveTab === 'SHIFT' ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                <Clock className={`w-5 h-5 ${empActiveTab === 'SHIFT' ? 'text-amber-500' : ''}`} />
                <span className="text-[10px] mt-0.5">Shift</span>
              </button>

              <button
                onClick={() => setEmpActiveTab('HISTORY')}
                className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  empActiveTab === 'HISTORY' ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                <Calendar className={`w-5 h-5 ${empActiveTab === 'HISTORY' ? 'text-amber-500' : ''}`} />
                <span className="text-[10px] mt-0.5">Register</span>
              </button>

              <button
                onClick={() => setEmpActiveTab('LEAVE')}
                className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  empActiveTab === 'LEAVE' ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                <FileText className={`w-5 h-5 ${empActiveTab === 'LEAVE' ? 'text-amber-500' : ''}`} />
                <span className="text-[10px] mt-0.5">Leave</span>
              </button>

              <button
                onClick={() => setEmpActiveTab('PROFILE')}
                className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  empActiveTab === 'PROFILE' ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                <Users className={`w-5 h-5 ${empActiveTab === 'PROFILE' ? 'text-amber-500' : ''}`} />
                <span className="text-[10px] mt-0.5">Profile</span>
              </button>
            </div>
          </main>
        )}
      </div>

      {/* Corporate Enterprise Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">Milestone Consultancy</span>
            <span>&bull;</span>
            <span>Workforce Management Platform</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] font-mono text-slate-400">
            <span>Server-Authoritative Geofencing</span>
            <span>&bull;</span>
            <span>Indian Standard Time (IST)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
