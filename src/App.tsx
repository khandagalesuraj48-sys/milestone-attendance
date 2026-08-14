import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, LocationSite } from './types';
import { api } from './lib/api';
import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';

// Employee Components
import { PunchCard } from './components/EmployeeDashboard/PunchCard';
import { AutoSignOutNotice } from './components/EmployeeDashboard/AutoSignOutNotice';
import { TodayShiftList } from './components/EmployeeDashboard/TodayShiftList';
import { MonthlyRegister } from './components/EmployeeDashboard/MonthlyRegister';
import { DeviceCard } from './components/EmployeeDashboard/DeviceCard';
import { LeaveRequestCard } from './components/EmployeeDashboard/LeaveRequestCard';

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
  Smartphone,
  FileSpreadsheet,
  Users,
  MapPin,
  ShieldAlert,
  Shield,
  FileText,
  BarChart3,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Employee State
  const [activeSession, setActiveSession] = useState<AttendanceRecord | null>(null);
  const [todayShifts, setTodayShifts] = useState<AttendanceRecord[]>([]);
  const [autoSignOutNotice, setAutoSignOutNotice] = useState<any>(null);
  const [empActiveTab, setEmpActiveTab] = useState<'PUNCH' | 'HISTORY' | 'LEAVE' | 'DEVICE'>('PUNCH');

  // Admin State
  const [adminActiveTab, setAdminActiveTab] = useState<
    'DASHBOARD' | 'REGISTER' | 'EMPLOYEES' | 'SITES' | 'SECURITY' | 'POLICY' | 'AUDIT' | 'REPORTS'
  >('DASHBOARD');
  const [adminSummary, setAdminSummary] = useState<Record<string, number>>({});
  const [adminTodayDate, setAdminTodayDate] = useState<string>('');
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-slate-500">Loading Milestone Workforce Engine...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // If password change/reset is required, display strict administrator reset notice
  if (currentUser.mustChangePassword) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
        <Navbar user={currentUser} onLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Password Reset Required
            </h3>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Your password must be reset by an administrator. Please contact your administrator.
            </p>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition shadow-xs"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Authoritative Navbar */}
      <Navbar user={currentUser} onLogout={handleLogout} />

      {/* Main App Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentUser.role === 'admin' ? (
          /* =========================================================================
             ADMINISTRATOR PORTAL
             ========================================================================= */
          <div className="space-y-6">
            {/* Admin Module Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xs text-xs">
              <button
                id="tab-admin-dashboard"
                onClick={() => setAdminActiveTab('DASHBOARD')}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center space-x-2 transition ${
                  adminActiveTab === 'DASHBOARD'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Operations Board</span>
              </button>

              <button
                id="tab-admin-register"
                onClick={() => setAdminActiveTab('REGISTER')}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center space-x-2 transition ${
                  adminActiveTab === 'REGISTER'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Live Muster Register</span>
              </button>

              <button
                id="tab-admin-employees"
                onClick={() => setAdminActiveTab('EMPLOYEES')}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center space-x-2 transition ${
                  adminActiveTab === 'EMPLOYEES'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Staff Workforce</span>
              </button>

              <button
                id="tab-admin-sites"
                onClick={() => setAdminActiveTab('SITES')}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center space-x-2 transition ${
                  adminActiveTab === 'SITES'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Multi-Site Geofences</span>
              </button>

              <button
                id="tab-admin-security"
                onClick={() => setAdminActiveTab('SECURITY')}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center space-x-2 transition ${
                  adminActiveTab === 'SECURITY'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Security Radar</span>
              </button>

              <button
                id="tab-admin-policy"
                onClick={() => setAdminActiveTab('POLICY')}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center space-x-2 transition ${
                  adminActiveTab === 'POLICY'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Policy & Rules</span>
              </button>

              <button
                id="tab-admin-audit"
                onClick={() => setAdminActiveTab('AUDIT')}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center space-x-2 transition ${
                  adminActiveTab === 'AUDIT'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Audit Vault</span>
              </button>

              <button
                id="tab-admin-reports"
                onClick={() => setAdminActiveTab('REPORTS')}
                className={`px-3.5 py-2 rounded-xl font-semibold flex items-center space-x-2 transition ${
                  adminActiveTab === 'REPORTS'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Monthly Reports</span>
              </button>
            </div>

            {/* Admin Active Tab View */}
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
          </div>
        ) : (
          /* =========================================================================
             EMPLOYEE SELF-SERVICE PORTAL
             ========================================================================= */
          <div className="space-y-6">
            {/* Auto Sign-Out Notification Banner */}
            <AutoSignOutNotice notice={autoSignOutNotice} />

            {/* Employee Tab Navigation */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xs text-xs">
              <button
                id="tab-emp-punch"
                onClick={() => setEmpActiveTab('PUNCH')}
                className={`px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition ${
                  empActiveTab === 'PUNCH'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Shift Punch & Clock</span>
              </button>

              <button
                id="tab-emp-history"
                onClick={() => setEmpActiveTab('HISTORY')}
                className={`px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition ${
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
                className={`px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition ${
                  empActiveTab === 'LEAVE'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Leave Requests</span>
              </button>

              <button
                id="tab-emp-device"
                onClick={() => setEmpActiveTab('DEVICE')}
                className={`px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition ${
                  empActiveTab === 'DEVICE'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>1:1 Device Binding</span>
              </button>
            </div>

            {/* Tab Views */}
            {empActiveTab === 'PUNCH' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <PunchCard
                    activeSession={activeSession}
                    todayShifts={todayShifts}
                    onAttendanceUpdate={loadEmployeeData}
                    locations={locations}
                  />
                </div>
                <div className="lg:col-span-5">
                  <TodayShiftList shifts={todayShifts} />
                </div>
              </div>
            )}

            {empActiveTab === 'HISTORY' && <MonthlyRegister />}

            {empActiveTab === 'LEAVE' && <LeaveRequestCard />}

            {empActiveTab === 'DEVICE' && <DeviceCard />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Milestone Consultancy. All rights reserved.</span>
          <span className="font-mono text-slate-500">Milestone Attendance System V1 Multi-Site &bull; IST Standard Time</span>
        </div>
      </footer>
    </div>
  );
}
