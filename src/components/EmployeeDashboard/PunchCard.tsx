import React, { useState, useEffect } from 'react';
import { AttendanceRecord, ShiftType, LocationSite, Site } from '../../types';
import { api } from '../../lib/api';
import { getCurrentBrowserLocation } from '../../lib/geo';
import {
  Sun,
  Moon,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  ShieldCheck,
  Building,
  Sparkles,
  Info,
  Navigation,
} from 'lucide-react';

interface PunchCardProps {
  activeSession: AttendanceRecord | null;
  todayShifts: AttendanceRecord[];
  onAttendanceUpdate: () => void;
  locations: LocationSite[];
  sites?: Site[];
}

export const PunchCard: React.FC<PunchCardProps> = ({
  activeSession,
  todayShifts,
  onAttendanceUpdate,
  locations,
  sites: propSites,
}) => {
  const [selectedShift, setSelectedShift] = useState<ShiftType>('DAY');
  const [availableSites, setAvailableSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  // GPS Simulation Presets for testing & live browser geolocation
  const [gpsSimMode, setGpsSimMode] = useState<string>('SITE_COORDINATES');

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

  // Filter locations belonging to the selected site
  const siteLocations = locations.filter((loc) => loc.siteId === selectedSiteId || !loc.siteId);

  // Auto-select first location when site changes
  useEffect(() => {
    if (siteLocations.length > 0) {
      // If current selected location is not in this site, update it
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

  // Live Elapsed Working Timer
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
        `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    };

    calculateElapsed();
    const timer = setInterval(calculateElapsed, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  // Coordinate resolution based on preset or live browser GPS
  const resolveCoordinates = async () => {
    if (gpsSimMode === 'BROWSER') {
      const geo = await getCurrentBrowserLocation();
      if (geo.error || !geo.coordinates) {
        throw new Error(geo.error || 'Failed to acquire GPS coordinates.');
      }
      return geo.coordinates;
    }

    if (gpsSimMode === 'OUTSIDE_GEOFENCE') {
      return { latitude: 19.5000, longitude: 73.5000, accuracy: 15 };
    }

    if (gpsSimMode === 'POOR_ACCURACY') {
      const targetLoc = locations.find((l) => (l.locationId || l.id) === selectedLocationId);
      return {
        latitude: targetLoc ? targetLoc.latitude : 18.6570,
        longitude: targetLoc ? targetLoc.longitude : 72.8790,
        accuracy: 150, // Exceeds 100m threshold
      };
    }

    // Default: Match exact coordinates of the selected location for pristine geofence match
    const targetLoc = locations.find((l) => (l.locationId || l.id) === selectedLocationId);
    if (targetLoc) {
      return {
        latitude: targetLoc.latitude,
        longitude: targetLoc.longitude,
        accuracy: 10,
      };
    }

    return { latitude: 18.6570, longitude: 72.8790, accuracy: 10 };
  };

  const handlePunchIn = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (!selectedSiteId) {
        throw new Error('Please select an authorized project site.');
      }
      if (!selectedLocationId) {
        throw new Error('Please select an approved location within the site.');
      }

      const coords = await resolveCoordinates();

      const res = await api.punchIn({
        shiftType: selectedShift,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        siteId: selectedSiteId,
        locationId: selectedLocationId,
      });

      setSuccessMsg(res.message);
      onAttendanceUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to complete Sign In.');
    } finally {
      setLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const coords = await resolveCoordinates();

      const res = await api.punchOut({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });

      setSuccessMsg(res.message);
      onAttendanceUpdate();
    } catch (err: any) {
      setError(err.message || 'Failed to complete Sign Out.');
    } finally {
      setLoading(false);
    }
  };

  const selectedSite = availableSites.find((s) => s.siteId === selectedSiteId);
  const selectedLocation = siteLocations.find((l) => (l.locationId || l.id) === selectedLocationId);

  return (
    <div id="punch-card-panel" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
      {/* Active Session Banner or Selection Header */}
      {activeSession ? (
        <div className="mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Play className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Active Session Open
                  </span>
                  {activeSession.isExtraShift && (
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                      Extra Night
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {activeSession.shiftType} Shift • {activeSession.siteNameSnapshot}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{activeSession.locationNameSnapshot}</span>
                  <span>• Started at {new Date(activeSession.signInTime!).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Working Duration
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-extrabold text-slate-900 tracking-tight">
                {elapsedTime}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Attendance Check-In
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select your assigned project site, physical location, and shift to perform verified sign in.
          </p>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <span className="font-bold block">Validation Check Failed:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-3">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <span className="font-bold block">Action Confirmed:</span>
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* When NO active session, show Site, Location, and Shift selectors */}
      {!activeSession && (
        <div className="space-y-5">
          {/* Shift Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Shift
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedShift('DAY')}
                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                  selectedShift === 'DAY'
                    ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/40 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">DAY Shift</div>
                    <div className="text-[11px] text-slate-500">08:00 AM – 05:00 PM</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedShift('NIGHT')}
                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                  selectedShift === 'NIGHT'
                    ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-400/40 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 flex items-center space-x-1">
                      <span>NIGHT Shift</span>
                      {isNightExtraShiftEligible && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                          Extra
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">07:00 PM – 04:00 AM</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Multi-Site Selector (Authorized Active Sites) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Authorized Project Site (Multi-Site Enabled)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {availableSites.map((site) => (
                <button
                  key={site.siteId}
                  type="button"
                  onClick={() => setSelectedSiteId(site.siteId)}
                  className={`p-3 rounded-xl border text-left transition flex items-center space-x-2.5 ${
                    selectedSiteId === site.siteId
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Building className={`w-4 h-4 ${selectedSiteId === site.siteId ? 'text-amber-400' : 'text-slate-400'}`} />
                  <div className="truncate">
                    <div className="font-semibold text-xs truncate">{site.siteName}</div>
                    <div className={`text-[10px] ${selectedSiteId === site.siteId ? 'text-slate-300' : 'text-slate-500'}`}>
                      ID: {site.siteId}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Approved Location Selector under Selected Site */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Approved Geofence Location
            </label>
            {siteLocations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {siteLocations.map((loc) => {
                  const locId = loc.locationId || loc.id || '';
                  const isSelected = selectedLocationId === locId;
                  return (
                    <button
                      key={locId}
                      type="button"
                      onClick={() => setSelectedLocationId(locId)}
                      className={`p-3 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{loc.locationName || loc.name}</span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {loc.radiusMeters}m Geofence
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">{loc.address || 'Project site perimeter'}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                No active locations configured for this site.
              </div>
            )}
          </div>
        </div>
      )}

      {/* GPS Simulation / Live Geolocation Preset Bar */}
      <div className="my-6 pt-5 border-t border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
            <Navigation className="w-3.5 h-3.5 text-slate-500" />
            <span>GPS Coordinate Mode</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Accuracy & Geofence validated server-side
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setGpsSimMode('SITE_COORDINATES')}
            className={`p-2 rounded-lg border text-center transition font-medium ${
              gpsSimMode === 'SITE_COORDINATES'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Inside Geofence (100%)
          </button>

          <button
            type="button"
            onClick={() => setGpsSimMode('BROWSER')}
            className={`p-2 rounded-lg border text-center transition font-medium ${
              gpsSimMode === 'BROWSER'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Live Device GPS
          </button>

          <button
            type="button"
            onClick={() => setGpsSimMode('OUTSIDE_GEOFENCE')}
            className={`p-2 rounded-lg border text-center transition font-medium ${
              gpsSimMode === 'OUTSIDE_GEOFENCE'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Outside Boundary (Test)
          </button>

          <button
            type="button"
            onClick={() => setGpsSimMode('POOR_ACCURACY')}
            className={`p-2 rounded-lg border text-center transition font-medium ${
              gpsSimMode === 'POOR_ACCURACY'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Poor Accuracy (&gt;100m)
          </button>
        </div>
      </div>

      {/* Visually Dominant Primary Action Button */}
      <div className="pt-2">
        {activeSession ? (
          <button
            type="button"
            onClick={handlePunchOut}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-base transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Calculating Working Hours & Validating Geofence...</span>
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
            type="button"
            onClick={handlePunchIn}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-base transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Executing Server-Side Geofence & Device Checks...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <Play className="w-5 h-5 fill-current text-amber-400" />
                <span>
                  SIGN IN • {selectedShift} SHIFT {selectedSite ? `(${selectedSite.siteName})` : ''}
                </span>
              </span>
            )}
          </button>
        )}
      </div>

      {/* Policy Footer */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Strict 1-Session Cardinality Enforced</span>
        </span>
        <span>Standard: 9.0h Full Day / 4.0h Half Day</span>
      </div>
    </div>
  );
};
