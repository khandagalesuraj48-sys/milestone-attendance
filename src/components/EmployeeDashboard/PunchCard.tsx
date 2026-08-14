import React, { useState, useEffect } from 'react';
import { AttendanceRecord, ShiftType, LocationSite, Site, User } from '../../types';
import { api } from '../../lib/api';
import { getCurrentBrowserLocation, LocationResult } from '../../lib/geo';
import {
  Sun,
  Moon,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Building,
  RotateCcw,
  ShieldCheck,
  Clock,
  CalendarCheck,
  TrendingUp,
  Award,
} from 'lucide-react';

interface PunchCardProps {
  user?: User | null;
  activeSession: AttendanceRecord | null;
  todayShifts: AttendanceRecord[];
  onAttendanceUpdate: () => void;
  locations: LocationSite[];
}

type LocationStatusType = 'IDLE' | 'CHECKING' | 'VERIFIED' | 'OUTSIDE' | 'PERMISSION_REQUIRED' | 'UNAVAILABLE';

export const PunchCard: React.FC<PunchCardProps> = ({
  user,
  activeSession,
  todayShifts,
  onAttendanceUpdate,
  locations,
}) => {
  const [selectedShift, setSelectedShift] = useState<ShiftType>('DAY');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [siteLocations, setSiteLocations] = useState<LocationSite[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [locationStatus, setLocationStatus] = useState<LocationStatusType>('IDLE');
  const [locationMessage, setLocationMessage] = useState<string>('');

  // Calculate dynamic time-of-day greeting
  const getGreetingText = () => {
    try {
      const now = new Date();
      const istHourStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
      });
      const hour = parseInt(istHourStr, 10);
      const name = user?.fullName ? user.fullName.split(' ')[0] : 'Colleague';

      if (hour >= 5 && hour < 12) return `Good Morning, ${name} 👋`;
      if (hour >= 12 && hour < 17) return `Good Afternoon, ${name} 👋`;
      if (hour >= 17 && hour < 21) return `Good Evening, ${name} 👋`;
      return `Good Night, ${name} 👋`;
    } catch {
      return `Welcome, ${user?.fullName || 'Colleague'} 👋`;
    }
  };

  // Load employee's authorized sites
  useEffect(() => {
    const loadSites = async () => {
      try {
        const res = await api.getSites();
        const siteList = res.sites || [];
        const active = siteList.filter((s) => s.isActive !== false);
        setAvailableSites(active);
        if (active.length > 0 && !selectedSiteId) {
          setSelectedSiteId(active[0].siteId);
        }
      } catch (err) {
        console.error('Failed to load sites:', err);
      }
    };
    loadSites();
  }, []);

  // Update available gate/perimeter locations whenever selected site changes
  useEffect(() => {
    if (selectedSiteId) {
      const filtered = locations.filter((loc) => loc.siteId === selectedSiteId);
      setSiteLocations(filtered);
      if (filtered.length > 0) {
        setSelectedLocationId(filtered[0].locationId || filtered[0].id || '');
      } else {
        setSelectedLocationId('');
      }
    }
  }, [selectedSiteId, locations]);

  // Check if today already has a Day shift recorded (making a Night shift eligible as extra)
  const isNightExtraShiftEligible = todayShifts.some(
    (s) => s.shiftType === 'DAY' && (s.status === 'PRESENT_FULL_DAY' || s.sessionStatus === 'CLOSED')
  );

  // Instant Verification of Location status against chosen Site Perimeter
  const verifyLocationStatus = async () => {
    setLocationStatus('CHECKING');
    setLocationMessage('Checking GPS location...');

    try {
      const geo = await getCurrentBrowserLocation();

      if (geo.error || !geo.coordinates) {
        if (geo.error?.includes('denied')) {
          setLocationStatus('PERMISSION_REQUIRED');
          setLocationMessage('Location permission required. Please enable browser GPS.');
        } else {
          setLocationStatus('UNAVAILABLE');
          setLocationMessage('GPS signal unavailable. Please ensure location services are enabled.');
        }
        return;
      }

      const targetLoc = siteLocations.find((l) => (l.locationId || l.id) === selectedLocationId);

      if (targetLoc && targetLoc.latitude && targetLoc.longitude) {
        const R = 6371e3; // Earth radius in meters
        const φ1 = (geo.coordinates.latitude * Math.PI) / 180;
        const φ2 = (targetLoc.latitude * Math.PI) / 180;
        const Δφ = ((targetLoc.latitude - geo.coordinates.latitude) * Math.PI) / 180;
        const Δλ = ((targetLoc.longitude - geo.coordinates.longitude) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance <= (targetLoc.radiusMeters || 100)) {
          setLocationStatus('VERIFIED');
          setLocationMessage(`Location Verified (${targetLoc.locationName || 'Project Site'})`);
        } else {
          setLocationStatus('OUTSIDE');
          setLocationMessage('Outside Attendance Area. Please be at your assigned site location.');
        }
      } else {
        setLocationStatus('VERIFIED');
        setLocationMessage('Location Ready');
      }
    } catch {
      setLocationStatus('UNAVAILABLE');
      setLocationMessage('Unable to verify location. Please retry.');
    }
  };

  useEffect(() => {
    if (selectedLocationId) {
      verifyLocationStatus();
    }
  }, [selectedLocationId]);

  // Live Elapsed Working Timer for active session
  useEffect(() => {
    if (!activeSession || !activeSession.signInTime) {
      setElapsedTime('00:00:00');
      setElapsedSeconds(0);
      return;
    }

    const calculateElapsed = () => {
      const start = new Date(activeSession.signInTime!).getTime();
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
      setElapsedSeconds(diffSeconds);

      const hours = Math.floor(diffSeconds / 3600);
      const mins = Math.floor((diffSeconds % 3600) / 60);
      const secs = diffSeconds % 60;
      setElapsedTime(
        `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
      );
    };

    calculateElapsed();
    const timer = setInterval(calculateElapsed, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  const handlePunchIn = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (!selectedSiteId) {
        throw new Error('Please select your assigned project site.');
      }
      if (!selectedLocationId) {
        throw new Error('Please select your site attendance location.');
      }

      // Fetch single live location at point of sign-in
      const geo: LocationResult = await getCurrentBrowserLocation();
      if (geo.error || !geo.coordinates) {
        throw new Error(geo.error || 'Location access is required to sign in. Please enable GPS location.');
      }

      const res = await api.punchIn({
        shiftType: selectedShift,
        latitude: geo.coordinates.latitude,
        longitude: geo.coordinates.longitude,
        accuracy: geo.coordinates.accuracy || 10,
        siteId: selectedSiteId,
        locationId: selectedLocationId,
      });

      setSuccessMsg(res.message);
      onAttendanceUpdate();
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Please verify you are within your assigned site.');
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // Fetch single live location at point of sign-out
      const geo: LocationResult = await getCurrentBrowserLocation();
      if (geo.error || !geo.coordinates) {
        throw new Error(geo.error || 'Location access is required to sign out. Please enable GPS location.');
      }

      const res = await api.punchOut({
        latitude: geo.coordinates.latitude,
        longitude: geo.coordinates.longitude,
        accuracy: geo.coordinates.accuracy || 10,
      });

      setSuccessMsg(res.message);
      onAttendanceUpdate();
    } catch (err: any) {
      setError(err.message || 'Unable to sign out. Please verify you are within your assigned site.');
    } finally {
      setLoading(false);
    }
  };

  const selectedSite = availableSites.find((s) => s.siteId === selectedSiteId);

  // Calculate today's total hours logged across all closed/open shifts
  const todayTotalHours = todayShifts.reduce((acc, curr) => {
    if (curr.totalWorkingHours) return acc + curr.totalWorkingHours;
    if (curr.sessionStatus === 'OPEN' && curr.signInTime) {
      const diffHrs = Math.max(0, (Date.now() - new Date(curr.signInTime).getTime()) / 3600000);
      return acc + diffHrs;
    }
    return acc;
  }, 0);

  // Shift progress percentage toward 9.0 hours standard day
  const shiftProgressPercent = Math.min(100, Math.round((elapsedSeconds / (9 * 3600)) * 100));

  return (
    <div id="punch-card-panel" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
      {/* 1. Header Greeting & Status Overview */}
      <div className="mb-6 pb-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            {getGreetingText()}
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-medium flex items-center space-x-1.5">
            <span className="font-semibold text-slate-800">{user?.designation || 'Site Staff'}</span>
            <span>&bull;</span>
            <span className="text-slate-600">{selectedSite?.siteName || 'Assigned Project Site'}</span>
          </p>
        </div>

        {/* Dynamic Status Badge */}
        <div>
          {activeSession ? (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              <span>Shift in Progress</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Ready to Sign In</span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <span className="font-bold block">Notice:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-3">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <span className="font-bold block">Success:</span>
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. PRIMARY VISUAL ELEMENT: DYNAMIC SIGN IN / SIGN OUT HERO ACTION BLOCK
          ========================================================================= */}
      {activeSession ? (
        /* ---------------- ACTIVE SESSION: SIGN OUT HERO BLOCK ---------------- */
        <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 text-white shadow-md border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
                  {activeSession.shiftType} SHIFT ONGOING
                </span>
                {activeSession.isExtraShift && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200 border border-purple-400/30 uppercase">
                    Extra Night
                  </span>
                )}
              </div>
              <h3 className="text-xl font-extrabold text-white mt-1">
                {activeSession.siteNameSnapshot}
              </h3>
              <p className="text-xs text-slate-300 mt-1 flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{activeSession.locationNameSnapshot || 'Main Gate Perimeter'}</span>
                <span>&bull;</span>
                <span>
                  Started at{' '}
                  <span className="font-bold text-white">
                    {new Date(activeSession.signInTime!).toLocaleTimeString('en-US', {
                      timeZone: 'Asia/Kolkata',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}{' '}
                    IST
                  </span>
                </span>
              </p>
            </div>

            {/* Live Working Digital Counter */}
            <div className="sm:text-right bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700/60 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Elapsed Working Time
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400 tracking-tight">
                {elapsedTime}
              </span>
            </div>
          </div>

          {/* Shift Progress Visual Bar */}
          <div className="py-4">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5 font-medium">
              <span>Shift Completion Benchmark</span>
              <span className="font-mono font-bold text-emerald-400">{shiftProgressPercent}% (Standard 9.0h)</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${shiftProgressPercent}%` }}
              />
            </div>
          </div>

          {/* PRIMARY VISUAL ACTION BUTTON: SIGN OUT */}
          <div className="pt-2">
            <button
              id="btn-sign-out"
              type="button"
              onClick={handlePunchOut}
              disabled={loading}
              className="w-full py-4 sm:py-4.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-base sm:text-lg transition flex items-center justify-center space-x-2.5 shadow-lg hover:shadow-rose-600/30 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Verifying Location & Signing Out...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <Square className="w-5 h-5 fill-current" />
                  <span>SIGN OUT &bull; COMPLETE SHIFT</span>
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ---------------- NO ACTIVE SESSION: SIGN IN HERO BLOCK ---------------- */
        <div className="space-y-6">
          {/* Shift Selection Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              1. Select Shift Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedShift('DAY')}
                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                  selectedShift === 'DAY'
                    ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/40 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                    <Sun className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">DAY Shift</div>
                    <div className="text-[11px] text-slate-500 font-medium">08:00 AM – 05:00 PM IST</div>
                  </div>
                </div>
                {selectedShift === 'DAY' && (
                  <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedShift('NIGHT')}
                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                  selectedShift === 'NIGHT'
                    ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-400/40 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                    <Moon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                      <span>NIGHT Shift</span>
                      {isNightExtraShiftEligible && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                          Extra
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">07:00 PM – 04:00 AM IST</div>
                  </div>
                </div>
                {selectedShift === 'NIGHT' && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* Assigned Project Site Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. Assigned Project Site
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {availableSites.map((site) => (
                <button
                  key={site.siteId}
                  type="button"
                  onClick={() => setSelectedSiteId(site.siteId)}
                  className={`p-3.5 rounded-xl border text-left transition flex items-center space-x-3 cursor-pointer ${
                    selectedSiteId === site.siteId
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Building className={`w-4 h-4 shrink-0 ${selectedSiteId === site.siteId ? 'text-amber-400' : 'text-slate-400'}`} />
                  <div className="truncate">
                    <div className="font-bold text-xs truncate">{site.siteName}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Site Location / Gate Selector (if multiple) */}
          {siteLocations.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                3. Site Location / Gate
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {siteLocations.map((loc) => {
                  const locId = loc.locationId || loc.id || '';
                  const isSelected = selectedLocationId === locId;
                  return (
                    <button
                      key={locId}
                      type="button"
                      onClick={() => setSelectedLocationId(locId)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{loc.locationName || loc.name}</div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{loc.address || 'Authorized Site Perimeter'}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clean Location Verification Badge */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              {locationStatus === 'CHECKING' && (
                <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin shrink-0" />
              )}
              {locationStatus === 'VERIFIED' && (
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
              )}
              {locationStatus === 'OUTSIDE' && (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              {(locationStatus === 'PERMISSION_REQUIRED' || locationStatus === 'UNAVAILABLE' || locationStatus === 'IDLE') && (
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
              )}

              <div className="text-xs">
                <span className="font-bold text-slate-900">
                  {locationStatus === 'VERIFIED' && '● Location Verified'}
                  {locationStatus === 'OUTSIDE' && '⚠ Outside Attendance Area'}
                  {locationStatus === 'PERMISSION_REQUIRED' && 'Location Permission Required'}
                  {locationStatus === 'CHECKING' && 'Checking Location...'}
                  {(locationStatus === 'UNAVAILABLE' || locationStatus === 'IDLE') && 'Location Verification'}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  {locationMessage || 'Location is verified on your assigned site.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={verifyLocationStatus}
              disabled={locationStatus === 'CHECKING'}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition text-xs flex items-center space-x-1 shrink-0 font-medium cursor-pointer"
              title="Re-verify Location"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${locationStatus === 'CHECKING' ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Check</span>
            </button>
          </div>

          {/* PRIMARY VISUAL ACTION BUTTON: SIGN IN */}
          <div className="pt-2">
            <button
              id="btn-sign-in"
              type="button"
              onClick={handlePunchIn}
              disabled={loading}
              className="w-full py-4 sm:py-4.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-extrabold text-base sm:text-lg transition flex items-center justify-center space-x-2.5 shadow-lg hover:shadow-slate-900/30 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Verifying Location & Signing In...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2.5">
                  <Play className="w-5 h-5 fill-current text-amber-400" />
                  <span>SIGN IN &bull; {selectedShift} SHIFT</span>
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. SHIFT STATUS & ATTENDANCE SUMMARY METRICS
          ========================================================================= */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CalendarCheck className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Today's Attendance Summary
            </h3>
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-500">
            {todayShifts.length} {todayShifts.length === 1 ? 'Session' : 'Sessions'} Recorded
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total Working Hours */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2 text-slate-500 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Logged Hours</span>
            </div>
            <div className="text-lg font-mono font-extrabold text-slate-900">
              {todayTotalHours.toFixed(1)} hrs
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Standard Target: 9.0h</span>
          </div>

          {/* Shift Classification */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2 text-slate-500 mb-1">
              <Award className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Shift Credit</span>
            </div>
            <div className="text-lg font-bold text-slate-900">
              {todayTotalHours >= 9.0
                ? 'Full Day'
                : todayTotalHours >= 4.0
                ? 'Half Day'
                : todayTotalHours > 0
                ? 'In Progress'
                : 'Not Recorded'}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              {todayTotalHours >= 9.0 ? '1.0 Regular Unit' : todayTotalHours >= 4.0 ? '0.5 Unit Earned' : '0.0 Unit'}
            </span>
          </div>

          {/* Security & Verification Status */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center space-x-2 text-slate-500 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Site Compliance</span>
            </div>
            <div className="text-lg font-bold text-emerald-700">
              Verified
            </div>
            <span className="text-[10px] text-slate-500 font-medium">GPS Geofence Protected</span>
          </div>
        </div>
      </div>

      {/* Policy Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center space-x-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Milestone Consultancy Multi-Site Attendance</span>
        </span>
        <span className="font-mono">IST Shift Policy</span>
      </div>
    </div>
  );
};
