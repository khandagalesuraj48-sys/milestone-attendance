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
  Sparkles,
  CalendarCheck,
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
  todayShifts = [],
  onAttendanceUpdate,
  locations = [],
}) => {
  const [selectedShift, setSelectedShift] = useState<ShiftType>('DAY');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [siteLocations, setSiteLocations] = useState<LocationSite[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<LocationStatusType>('IDLE');
  const [locationMessage, setLocationMessage] = useState<string>('');

  // Calculate dynamic time-of-day greeting from IST
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
      return `Good Evening, ${name} 👋`;
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
      const locList = locations || [];
      const filtered = locList.filter((loc) => loc.siteId === selectedSiteId);
      setSiteLocations(filtered);
      if (filtered.length > 0) {
        setSelectedLocationId(filtered[0].locationId || filtered[0].id || '');
      } else {
        setSelectedLocationId('');
      }
    }
  }, [selectedSiteId, locations]);

  // Check if today already has a Day shift recorded (making a Night shift eligible as extra)
  const isNightExtraShiftEligible = (todayShifts || []).some(
    (s) => s.shiftType === 'DAY' && (s.attendanceStatus === 'PRESENT_FULL_DAY' || s.sessionStatus === 'CLOSED')
  );

  // Instant Verification of Location status against chosen Site Perimeter
  const verifyLocationStatus = async () => {
    setLocationStatus('CHECKING');
    setLocationMessage('Checking location...');

    try {
      const geo = await getCurrentBrowserLocation();

      if (geo.error || !geo.coordinates) {
        if (geo.error?.includes('denied')) {
          setLocationStatus('PERMISSION_REQUIRED');
          setLocationMessage('Location permission required. Please enable device location.');
        } else {
          setLocationStatus('UNAVAILABLE');
          setLocationMessage('Location signal unavailable. Please ensure GPS is enabled.');
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
          setLocationMessage('Inside authorized area');
        } else {
          setLocationStatus('OUTSIDE');
          setLocationMessage('Outside authorized area');
        }
      } else {
        setLocationStatus('VERIFIED');
        setLocationMessage('Inside authorized area');
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
        throw new Error(geo.error || 'Location access is required to sign in. Please enable device location.');
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
        throw new Error(geo.error || 'Location access is required to sign out. Please enable device location.');
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
  const selectedLoc = siteLocations.find((l) => (l.locationId || l.id) === selectedLocationId);

  // Format record time helper
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div id="punch-card-panel" className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 lg:p-7 shadow-xs text-slate-900 space-y-4 sm:space-y-5">
      {/* -------------------------------------------------------------------
          1. GREETING & IDENTITY SECTION (Compact, Dynamic IST)
          ------------------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 truncate">
            {getGreetingText()}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium flex items-center space-x-1.5 truncate">
            <span className="font-semibold text-slate-800">{user?.designation || 'Site Staff'}</span>
            <span>&bull;</span>
            <span className="text-slate-600 truncate">{selectedSite?.siteName || 'RCL'}</span>
          </p>
        </div>

        {/* Dynamic Status Badge */}
        <div className="shrink-0">
          {activeSession ? (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Signed In &bull; Active</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Ready to Sign In</span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">
            <span className="font-bold">Notice: </span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <div className="flex-1">
            <span className="font-bold">Success: </span>
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------
          ACTIVE SESSION HERO: SIGN OUT BLOCK
          ------------------------------------------------------------------- */}
      {activeSession ? (
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                  {activeSession.shiftType} SHIFT &bull; SIGNED IN
                </span>
                {activeSession.isExtraShift && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30 uppercase">
                    Extra Night
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1.5 truncate">
                {activeSession.siteNameSnapshot || selectedSite?.siteName || 'Project Site'}
              </h3>
              <p className="text-xs text-slate-300 mt-1 flex items-center space-x-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{activeSession.locationNameSnapshot || 'Site Perimeter'}</span>
                <span>&bull;</span>
                <span>
                  Signed In at <strong className="text-white">{formatTime(activeSession.signInTime)} IST</strong>
                </span>
              </p>
            </div>

            {/* Dynamic Active Status Banner */}
            <div className="bg-emerald-950/70 border border-emerald-500/40 px-4 py-2.5 rounded-xl shrink-0 inline-flex flex-col sm:items-end justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Attendance Active</span>
              </span>
              <span className="text-xs font-medium text-slate-300 mt-0.5">
                Shift in progress
              </span>
            </div>
          </div>

          {/* SIGN OUT PRIMARY BUTTON */}
          <button
            id="btn-sign-out"
            type="button"
            onClick={handlePunchOut}
            disabled={loading}
            className="w-full py-3.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-sm sm:text-base transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Signing Out...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Square className="w-4 h-4 fill-current" />
                <span>SIGN OUT &bull; COMPLETE SHIFT</span>
              </span>
            )}
          </button>
        </div>
      ) : (
        /* -------------------------------------------------------------------
            NO ACTIVE SESSION: SHIFT SELECTION & SIGN IN WORKFLOW
            ------------------------------------------------------------------- */
        <div className="space-y-3.5 sm:space-y-4">
          {/* -------------------------------------------------------------------
              2. SHIFT SELECTION — COMPACT HORIZONTALLY-ALIGNED TOGGLE
              ------------------------------------------------------------------- */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Shift
              </label>
              {isNightExtraShiftEligible && (
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Day Done &bull; Extra Night Eligible
                </span>
              )}
            </div>

            {/* Compact Horizontally-Aligned Segmented Toggle Control */}
            <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/80 shadow-inner w-full">
              {/* DAY Shift Toggle Item */}
              <button
                id="shift-toggle-day"
                type="button"
                onClick={() => setSelectedShift('DAY')}
                className={`flex-1 py-2 px-2 sm:px-3 rounded-xl transition-all duration-150 flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-bold min-h-[44px] cursor-pointer ${
                  selectedShift === 'DAY'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold'
                }`}
              >
                <Sun className={`w-4 h-4 shrink-0 ${selectedShift === 'DAY' ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>Day</span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                  (08:00–17:00)
                </span>
              </button>

              {/* NIGHT Shift Toggle Item */}
              <button
                id="shift-toggle-night"
                type="button"
                onClick={() => setSelectedShift('NIGHT')}
                className={`flex-1 py-2 px-2 sm:px-3 rounded-xl transition-all duration-150 flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-bold min-h-[44px] cursor-pointer ${
                  selectedShift === 'NIGHT'
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold'
                }`}
              >
                <Moon className={`w-4 h-4 shrink-0 ${selectedShift === 'NIGHT' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>Night</span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                  (19:00–04:00)
                </span>
                {isNightExtraShiftEligible && (
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[9px] font-extrabold uppercase shrink-0">
                    Extra
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Assigned Project Site & Gate Selector (Compact) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Site selector if multiple sites */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Site
              </label>
              {availableSites.length <= 1 ? (
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center space-x-2">
                  <Building className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{availableSites[0]?.siteName || 'RCL • WALSHIND'}</span>
                </div>
              ) : (
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  {availableSites.map((s) => (
                    <option key={s.siteId} value={s.siteId}>
                      {s.siteName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Location Gate Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Attendance Gate / Perimeter
              </label>
              {siteLocations.length <= 1 ? (
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{siteLocations[0]?.locationName || 'Main Gate Perimeter'}</span>
                </div>
              ) : (
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  {siteLocations.map((loc) => {
                    const lId = loc.locationId || loc.id || '';
                    return (
                      <option key={lId} value={lId}>
                        {loc.locationName || loc.name || 'Site Perimeter'}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------------------
              3. LOCATION VERIFICATION (Clean & Human-Readable)
              ------------------------------------------------------------------- */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="shrink-0">
                {locationStatus === 'CHECKING' && (
                  <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin block" />
                )}
                {locationStatus === 'VERIFIED' && (
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 block" />
                )}
                {locationStatus === 'OUTSIDE' && (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                {(locationStatus === 'PERMISSION_REQUIRED' || locationStatus === 'UNAVAILABLE' || locationStatus === 'IDLE') && (
                  <MapPin className="w-4 h-4 text-slate-500" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    📍 Location Verification
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium truncate">
                    &bull; {selectedSite?.siteName || 'RCL'} {selectedLoc?.locationName ? `(${selectedLoc.locationName})` : ''}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                  {locationStatus === 'VERIFIED' && <span className="text-emerald-700">● Inside authorized area</span>}
                  {locationStatus === 'OUTSIDE' && <span className="text-amber-700">⚠ Outside authorized area</span>}
                  {locationStatus === 'PERMISSION_REQUIRED' && <span className="text-rose-700">Location permission required</span>}
                  {locationStatus === 'CHECKING' && <span className="text-slate-600">Verifying location...</span>}
                  {(locationStatus === 'UNAVAILABLE' || locationStatus === 'IDLE') && (
                    <span className="text-slate-700">Ready to verify location</span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={verifyLocationStatus}
              disabled={locationStatus === 'CHECKING'}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200 transition text-xs font-semibold flex items-center space-x-1 shrink-0 cursor-pointer shadow-2xs"
              title="Re-check Location"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${locationStatus === 'CHECKING' ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Check</span>
            </button>
          </div>

          {/* -------------------------------------------------------------------
              4. PRIMARY ATTENDANCE BUTTON: SIGN IN
              ------------------------------------------------------------------- */}
          <button
            id="btn-sign-in"
            type="button"
            onClick={handlePunchIn}
            disabled={loading}
            className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-extrabold text-base transition flex items-center justify-center space-x-2.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Verifying Location & Signing In...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Play className="w-4 h-4 fill-current text-amber-400" />
                <span>SIGN IN &bull; {selectedShift} SHIFT</span>
              </span>
            )}
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------
          5. TODAY'S ATTENDANCE RECORDS (Directly below Sign In / Sign Out)
          ------------------------------------------------------------------- */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Today's Attendance
            </h3>
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-500">
            {todayShifts.length} {todayShifts.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {todayShifts.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs bg-slate-50/80 rounded-2xl border border-slate-100">
            No attendance records logged today yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayShifts.map((record) => {
              const recId = record.recordId || record.id;
              const isOpen = record.sessionStatus === 'OPEN' || record.attendanceState === 'SIGNED_IN';

              return (
                <div
                  key={recId}
                  className={`p-3.5 rounded-2xl border transition ${
                    isOpen
                      ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                      : 'bg-slate-50/90 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          record.shiftType === 'DAY'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {record.shiftType === 'DAY' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-slate-900">{record.shiftType} SHIFT</span>
                          {record.isExtraShift && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                              Extra Night
                            </span>
                          )}
                          {record.isLate && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                              Late
                            </span>
                          )}
                          {record.signOutType === 'AUTO_SIGNED_OUT' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              Auto Closed
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {record.siteNameSnapshot || 'RCL'} • {record.locationNameSnapshot || 'WALSHIND'}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {isOpen ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      ) : record.attendanceStatus === 'PRESENT_FULL_DAY' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Full Day
                        </span>
                      ) : record.attendanceStatus === 'PRESENT_HALF_DAY' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Half Day
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {record.attendanceStatus || 'Recorded'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Compact Time Grid: SIGN IN | SIGN OUT | DURATION */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-1.5 rounded-xl border border-slate-200/80">
                      <div className="text-[9px] text-slate-500 font-bold uppercase">SIGN IN</div>
                      <div className="font-mono text-slate-900 font-semibold text-[11px] mt-0.5">
                        {formatTime(record.signInTime)}
                      </div>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-slate-200/80">
                      <div className="text-[9px] text-slate-500 font-bold uppercase">SIGN OUT</div>
                      <div className="font-mono text-slate-900 font-semibold text-[11px] mt-0.5">
                        {isOpen ? 'ACTIVE' : formatTime(record.signOutTime)}
                      </div>
                    </div>
                    <div className="bg-white p-1.5 rounded-xl border border-slate-200/80">
                      <div className="text-[9px] text-slate-500 font-bold uppercase">SESSION</div>
                      <div className="text-slate-900 font-bold text-[11px] mt-0.5 truncate">
                        {isOpen ? (
                          <span className="text-emerald-700">Active</span>
                        ) : record.attendanceStatus === 'PRESENT_FULL_DAY' ? (
                          'Full Day'
                        ) : record.attendanceStatus === 'PRESENT_HALF_DAY' ? (
                          'Half Day'
                        ) : (
                          'Completed'
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

      {/* -------------------------------------------------------------------
          6. ATTENDANCE SUMMARY METRICS (Attendance Status & Security)
          ------------------------------------------------------------------- */}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Today's Shifts</span>
          <span className="text-sm font-bold text-slate-900 block mt-0.5">
            {todayShifts.length} {todayShifts.length === 1 ? 'Shift' : 'Shifts'}
          </span>
          <span className="text-[9px] text-slate-400 font-medium">Logged Today</span>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Attendance Status</span>
          <span className="text-sm font-bold text-slate-900 block mt-0.5">
            {activeSession ? (
              <span className="text-emerald-700">Signed In</span>
            ) : todayShifts.length > 0 ? (
              'Recorded'
            ) : (
              'Ready'
            )}
          </span>
          <span className="text-[9px] text-slate-400 font-medium">
            {activeSession ? 'Shift Active' : 'Daily Record'}
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Perimeter</span>
          <span className="text-sm font-bold text-emerald-700 block mt-0.5 flex items-center justify-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified</span>
          </span>
          <span className="text-[9px] text-slate-400 font-medium">Geofenced</span>
        </div>
      </div>
    </div>
  );
};
