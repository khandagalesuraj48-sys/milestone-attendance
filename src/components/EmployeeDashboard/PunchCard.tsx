import React, { useState, useEffect } from 'react';
import { AttendanceRecord, ShiftType, LocationSite, Site, User } from '../../types';
import { api } from '../../lib/api';
import { getCurrentBrowserLocation, LocationResult } from '../../lib/geo';
import {
  Sun,
  Moon,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Building,
  RotateCcw,
  ShieldCheck,
  Sunrise,
  Sunset,
} from 'lucide-react';

interface PunchCardProps {
  user?: User | null;
  activeSession: AttendanceRecord | null;
  todayShifts: AttendanceRecord[];
  onAttendanceUpdate: () => void;
  locations: LocationSite[];
  sites?: Site[];
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
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  // Location status state
  const [locationStatus, setLocationStatus] = useState<LocationStatusType>('IDLE');
  const [locationMessage, setLocationMessage] = useState<string>('');

  // Calculate dynamic greeting
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
        if (res.success && res.sites.length > 0) {
          setAvailableSites(res.sites);
          if (!selectedSiteId) {
            setSelectedSiteId(res.sites[0].siteId);
          }
        }
      } catch (err) {
        console.error('Failed to load employee authorized sites', err);
      }
    };
    loadSites();
  }, []);

  // Filter locations belonging to selected site
  const siteLocations = locations.filter((loc) => loc.siteId === selectedSiteId || !loc.siteId);

  // Auto-select first location when site changes
  useEffect(() => {
    if (siteLocations.length > 0) {
      const currentExists = siteLocations.some((l) => (l.locationId || l.id) === selectedLocationId);
      if (!currentExists) {
        setSelectedLocationId(siteLocations[0].locationId || siteLocations[0].id || '');
      }
    } else {
      setSelectedLocationId('');
    }
  }, [selectedSiteId, locations]);

  // Sync shift with active session if open
  useEffect(() => {
    if (activeSession) {
      setSelectedShift(activeSession.shiftType);
    }
  }, [activeSession]);

  // Check if today already has a Day shift recorded (completed)
  const existingDayShift = todayShifts.find((s) => s.shiftType === 'DAY');
  const isNightExtraShiftEligible = selectedShift === 'NIGHT' && !!existingDayShift;

  // Single location validation check on open/change
  const verifyLocationStatus = async () => {
    setLocationStatus('CHECKING');
    setLocationMessage('Checking attendance area...');

    try {
      const geo = await getCurrentBrowserLocation();
      if (geo.error || !geo.coordinates) {
        if (geo.error?.includes('denied')) {
          setLocationStatus('PERMISSION_REQUIRED');
          setLocationMessage('Location permission required. Please enable browser location.');
        } else {
          setLocationStatus('UNAVAILABLE');
          setLocationMessage('GPS signal unavailable. Please ensure location services are enabled.');
        }
        return;
      }

      // Check distance against current target location
      const targetLoc = locations.find((l) => (l.locationId || l.id) === selectedLocationId);
      if (targetLoc) {
        const R = 6371000;
        const dLat = ((targetLoc.latitude - geo.coordinates.latitude) * Math.PI) / 180;
        const dLon = ((targetLoc.longitude - geo.coordinates.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((geo.coordinates.latitude * Math.PI) / 180) *
            Math.cos((targetLoc.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = Math.round(R * c);

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
      return;
    }

    const calculateElapsed = () => {
      const start = new Date(activeSession.signInTime!).getTime();
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
      const hours = Math.floor(diffSeconds / 3600);
      const mins = Math.floor((diffSeconds % 3600) / 60);
      const secs = diffSeconds % 60;
      setElapsedTime(
        `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`
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

  return (
    <div id="punch-card-panel" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
      {/* Dynamic Header & Employee Context */}
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

        {/* Current Attendance Status Badge */}
        <div>
          {activeSession ? (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              <span>Signed In &bull; Working {elapsedTime}</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold text-xs">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Not yet signed in</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Session Detailed Card */}
      {activeSession && (
        <div className="mb-6 p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Play className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded-md">
                    {activeSession.shiftType} SHIFT ONGOING
                  </span>
                  {activeSession.isExtraShift && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                      Extra Night
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {activeSession.siteNameSnapshot}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Signed In at{' '}
                  <span className="font-semibold text-slate-900">
                    {new Date(activeSession.signInTime!).toLocaleTimeString('en-US', {
                      timeZone: 'Asia/Kolkata',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}{' '}
                    IST
                  </span>{' '}
                  &bull; {activeSession.locationNameSnapshot}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Time
              </span>
              <span className="text-2xl font-mono font-extrabold text-slate-900 tracking-tight">
                {elapsedTime}
              </span>
            </div>
          </div>
        </div>
      )}

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

      {/* Shift, Site & Location Selectors (when no active session) */}
      {!activeSession && (
        <div className="space-y-5">
          {/* Shift Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Today's Shift
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedShift('DAY')}
                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                  selectedShift === 'DAY'
                    ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">DAY Shift</div>
                    <div className="text-[11px] text-slate-500 font-medium">08:00 AM – 05:00 PM</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShift('NIGHT')}
                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                  selectedShift === 'NIGHT'
                    ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400/40 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                    <Moon className="w-5 h-5" />
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
                    <div className="text-[11px] text-slate-500 font-medium">07:00 PM – 04:00 AM</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Assigned Project Site Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Assigned Project Site
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

          {/* Approved Location Selection */}
          {siteLocations.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Site Location / Gate
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
        </div>
      )}

      {/* Human-Friendly Clean Location Status Indicator */}
      <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
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

      {/* Prominent Primary Action Button */}
      <div className="pt-2">
        {activeSession ? (
          <button
            id="btn-sign-out"
            type="button"
            onClick={handlePunchOut}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-base transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Verifying Location & Signing Out...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Square className="w-5 h-5 fill-current" />
                <span>SIGN OUT ({activeSession.shiftType} Shift)</span>
              </span>
            )}
          </button>
        ) : (
          <button
            id="btn-sign-in"
            type="button"
            onClick={handlePunchIn}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-base transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Verifying Location & Signing In...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Play className="w-5 h-5 fill-current text-amber-400" />
                <span>
                  SIGN IN &bull; {selectedShift} SHIFT
                </span>
              </span>
            )}
          </button>
        )}
      </div>

      {/* Policy Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center space-x-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Milestone Verified Geofence</span>
        </span>
        <span className="font-mono">IST Shift Policy</span>
      </div>
    </div>
  );
};

