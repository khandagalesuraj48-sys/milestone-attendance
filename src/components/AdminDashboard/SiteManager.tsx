import React, { useState, useEffect } from 'react';
import { LocationSite, Site, ShiftMergeSitePayload } from '../../types';
import { api } from '../../lib/api';
import {
  MapPin,
  Plus,
  CheckCircle,
  ShieldCheck,
  Edit2,
  X,
  Building2,
  Layers,
  AlertCircle,
  Users,
  Eye,
  Navigation,
  CheckCircle2,
  Trash2,
  ArrowRightLeft,
  RefreshCw,
  Info,
} from 'lucide-react';

interface SiteManagerProps {
  locations: LocationSite[];
  onRefresh: () => void;
}

export const SiteManager: React.FC<SiteManagerProps> = ({ locations, onRefresh }) => {
  const [sites, setSites] = useState<(Site & { locationsCount?: number; assignedEmployeesCount?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showEditSiteModal, setShowEditSiteModal] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [showEditLocationModal, setShowEditLocationModal] = useState(false);
  const [showShiftMergeModal, setShowShiftMergeModal] = useState(false);
  const [selectedSiteForDrilldown, setSelectedSiteForDrilldown] = useState<any>(null);

  // Edit Site State
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editSiteName, setEditSiteName] = useState('');
  const [editSiteActive, setEditSiteActive] = useState(true);

  // Edit Location State
  const [editingLocation, setEditingLocation] = useState<LocationSite | null>(null);
  const [editLocSiteId, setEditLocSiteId] = useState('');
  const [editLocName, setEditLocName] = useState('');
  const [editLocAddress, setEditLocAddress] = useState('');
  const [editLocLat, setEditLocLat] = useState('18.6570');
  const [editLocLng, setEditLocLng] = useState('72.8790');
  const [editLocRadius, setEditLocRadius] = useState('200');
  const [editLocAccuracyThreshold, setEditLocAccuracyThreshold] = useState('100');

  // New Site Form State
  const [newSiteId, setNewSiteId] = useState('');
  const [newSiteName, setNewSiteName] = useState('');

  // New Location Form State
  const [locSiteId, setLocSiteId] = useState('');
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locLat, setLocLat] = useState('18.6570');
  const [locLng, setLocLng] = useState('72.8790');
  const [locRadius, setLocRadius] = useState('200');
  const [locAccuracyThreshold, setLocAccuracyThreshold] = useState('100');

  // Shift & Merge Form State
  const [shiftSourceSiteId, setShiftSourceSiteId] = useState('');
  const [shiftTargetSiteId, setShiftTargetSiteId] = useState('');
  const [migrateEmployees, setMigrateEmployees] = useState(true);
  const [migrateLocations, setMigrateLocations] = useState(true);
  const [deactivateSource, setDeactivateSource] = useState(true);

  // Dependency warning modal state
  const [dependencyWarning, setDependencyWarning] = useState<{
    siteId: string;
    siteName: string;
    employeeCount: number;
    locationCount: number;
  } | null>(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchSites = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminSites();
      if (res.success) {
        setSites(res.sites);
        if (!locSiteId && res.sites.length > 0) {
          setLocSiteId(res.sites[0].siteId);
        }
      }
    } catch (err) {
      console.error('Failed to load sites', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      setLoading(true);
      await api.createSite({
        siteId: newSiteId || undefined,
        siteName: newSiteName,
      });
      setShowAddSiteModal(false);
      setNewSiteId('');
      setNewSiteName('');
      setSuccessMsg('Project Site provisioned successfully.');
      fetchSites();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create site.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;
    setError('');
    setSuccessMsg('');
    try {
      setLoading(true);
      await api.updateSite(editingSite.siteId, {
        siteName: editSiteName,
        isActive: editSiteActive,
      });
      setShowEditSiteModal(false);
      setEditingSite(null);
      setSuccessMsg(`Project site "${editSiteName}" updated successfully.`);
      fetchSites();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update site.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      setLoading(true);
      await api.createLocation({
        siteId: locSiteId,
        locationName: locName,
        address: locAddress,
        latitude: parseFloat(locLat),
        longitude: parseFloat(locLng),
        radiusMeters: parseInt(locRadius, 10),
        accuracyThresholdMeters: parseInt(locAccuracyThreshold, 10),
      });
      setShowAddLocationModal(false);
      setLocName('');
      setLocAddress('');
      setSuccessMsg('Geofence Location registered successfully under selected site.');
      onRefresh();
      fetchSites();
    } catch (err: any) {
      setError(err.message || 'Failed to create location.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;
    const locId = editingLocation.locationId || editingLocation.id;
    setError('');
    setSuccessMsg('');
    try {
      setLoading(true);
      await api.updateLocation(locId, {
        siteId: editLocSiteId,
        locationName: editLocName,
        address: editLocAddress,
        latitude: parseFloat(editLocLat),
        longitude: parseFloat(editLocLng),
        radiusMeters: parseInt(editLocRadius, 10),
        accuracyThresholdMeters: parseInt(editLocAccuracyThreshold, 10),
      });
      setShowEditLocationModal(false);
      setEditingLocation(null);
      setSuccessMsg(`Geofence location "${editLocName}" updated successfully.`);
      onRefresh();
      fetchSites();
    } catch (err: any) {
      setError(err.message || 'Failed to update location.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    const site = sites.find((s) => s.siteId === siteId);
    const siteLocations = locations.filter((loc) => loc.siteId === siteId);
    const empCount = site?.assignedEmployeesCount || 0;
    const locCount = siteLocations.length;

    if (empCount > 0 || locCount > 0) {
      setDependencyWarning({
        siteId,
        siteName,
        employeeCount: empCount,
        locationCount: locCount,
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to deactivate Project Site "${siteName}" (${siteId})?`)) return;
    try {
      setLoading(true);
      setError('');
      await api.deleteSite(siteId);
      setSuccessMsg(`Project site "${siteName}" deactivated successfully.`);
      fetchSites();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete site.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteShiftMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftSourceSiteId || !shiftTargetSiteId) {
      setError('Please select both source and target project sites.');
      return;
    }
    if (shiftSourceSiteId === shiftTargetSiteId) {
      setError('Source and target project sites cannot be identical.');
      return;
    }

    setError('');
    setSuccessMsg('');
    try {
      setLoading(true);
      const res = await api.shiftMergeSites({
        sourceSiteId: shiftSourceSiteId,
        targetSiteId: shiftTargetSiteId,
        shiftEmployees: migrateEmployees,
        shiftLocations: migrateLocations,
        deactivateSourceSiteAfterShift: deactivateSource,
      });
      setShowShiftMergeModal(false);
      setDependencyWarning(null);
      setSuccessMsg(res.message || 'Projects shifted and merged successfully.');
      fetchSites();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to execute project shift/merge.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async (locId: string, locName: string) => {
    if (!window.confirm(`Are you sure you want to deactivate Geofence Location "${locName}"? Any employee assigned exclusively to this location perimeter will be unlinked safely.`)) return;
    try {
      setLoading(true);
      setError('');
      await api.deleteLocation(locId);
      setSuccessMsg(`Geofence location "${locName}" deactivated successfully.`);
      fetchSites();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete location.');
    } finally {
      setLoading(false);
    }
  };

  const openEditSite = (site: Site) => {
    setEditingSite(site);
    setEditSiteName(site.siteName);
    setEditSiteActive(site.isActive !== false);
    setShowEditSiteModal(true);
  };

  const openEditLocation = (loc: LocationSite) => {
    setEditingLocation(loc);
    setEditLocSiteId(loc.siteId || (sites[0]?.siteId ?? ''));
    setEditLocName(loc.locationName || loc.name || '');
    setEditLocAddress(loc.address || '');
    setEditLocLat(String(loc.latitude || 18.6570));
    setEditLocLng(String(loc.longitude || 72.8790));
    setEditLocRadius(String(loc.radiusMeters || 200));
    setEditLocAccuracyThreshold(String(loc.accuracyThresholdMeters || 100));
    setShowEditLocationModal(true);
  };

  const openAddLocationForSite = (siteId: string) => {
    setLocSiteId(siteId);
    setShowAddLocationModal(true);
  };

  const openShiftMergeFromWarning = (sourceSiteId: string) => {
    setShiftSourceSiteId(sourceSiteId);
    const otherSites = sites.filter((s) => s.siteId !== sourceSiteId && s.isActive);
    if (otherSites.length > 0) {
      setShiftTargetSiteId(otherSites[0].siteId);
    }
    setDependencyWarning(null);
    setShowShiftMergeModal(true);
  };

  return (
    <div id="site-manager" className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Section 1: Authorized Project Sites Master */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Project Sites Master (Multi-Site)</h3>
            <p className="text-xs text-slate-500">
              Administrative project sites with full lifecycle management, dependency-safe deactivation, and shift/merge capabilities.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (sites.length >= 2) {
                  setShiftSourceSiteId(sites[0].siteId);
                  setShiftTargetSiteId(sites[1].siteId);
                }
                setShowShiftMergeModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center space-x-1.5 transition border border-slate-200"
              title="Shift employees and geofences from one project to another"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Shift / Merge Projects</span>
            </button>
            <button
              onClick={() => setShowAddSiteModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add Project Site</span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sites.map((site) => {
            const siteLocations = locations.filter((loc) => loc.siteId === site.siteId);
            return (
              <div
                key={site.siteId}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{site.siteName}</h4>
                        <span className="font-mono text-[10px] text-slate-500">{site.siteId}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        site.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {site.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">{siteLocations.length} Location(s)</span>
                    <span>{site.assignedEmployeesCount || 0} Staff Assigned</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => setSelectedSiteForDrilldown({ ...site, siteLocations })}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center space-x-1 transition cursor-pointer"
                    title="View Perimeters"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Perimeters</span>
                  </button>
                  <button
                    onClick={() => openEditSite(site)}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs transition cursor-pointer"
                    title="Edit Site Name & Status"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openAddLocationForSite(site.siteId)}
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs transition cursor-pointer"
                    title="Add Location under this Site"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteSite(site.siteId, site.siteName)}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs transition cursor-pointer border border-rose-200"
                    title="Deactivate Project Site"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Approved Geofence Locations */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Geofence Boundary Perimeters</h3>
            <p className="text-xs text-slate-500">
              Physical office & site gates with Server-Authoritative Haversine validation and configurable accuracy thresholds
            </p>
          </div>

          <button
            onClick={() => {
              if (sites.length > 0) setLocSiteId(sites[0].siteId);
              setShowAddLocationModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Geofence Location</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((loc) => {
            const locId = loc.locationId || loc.id;
            const parentSite = sites.find((s) => s.siteId === loc.siteId);
            return (
              <div key={locId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-amber-600">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{loc.locationName || loc.name}</h4>
                      <p className="text-xs font-semibold text-slate-600">
                        {parentSite ? parentSite.siteName : loc.siteName || 'Project Site'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white text-slate-800 border border-slate-200">
                      {loc.radiusMeters}m Radius
                    </span>
                    <button
                      onClick={() => openEditLocation(loc)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer"
                      title="Edit Geofence Parameters"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(locId, loc.locationName || loc.name || 'Location')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Deactivate Location"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 truncate">{loc.address || 'Standard site perimeter'}</p>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs font-mono text-slate-500">
                  <span>
                    Lat: {loc.latitude?.toFixed(4)} • Lng: {loc.longitude?.toFixed(4)}
                  </span>
                  <span className="text-emerald-700 flex items-center space-x-1 font-sans font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Threshold: {loc.accuracyThresholdMeters || 100}m</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dependency Warning Dialog (Site Deletion Blocked) */}
      {dependencyWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setDependencyWarning(null)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cannot Deactivate Active Project</h3>
                <span className="font-mono text-xs text-slate-500">{dependencyWarning.siteName} ({dependencyWarning.siteId})</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2 mb-6">
              <div className="font-bold flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Active Dependencies Detected</span>
              </div>
              <p>
                This project site currently has <strong>{dependencyWarning.employeeCount} active employee(s)</strong> and <strong>{dependencyWarning.locationCount} registered geofence perimeter(s)</strong>.
              </p>
              <p className="text-slate-600">
                To preserve historical integrity and ensure continuous geofence clocking, please shift and reassign the workforce and locations to another project first.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDependencyWarning(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-800 text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => openShiftMergeFromWarning(dependencyWarning.siteId)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>Shift & Merge Project</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift & Merge Projects Modal */}
      {showShiftMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowShiftMergeModal(false)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-slate-900 text-white rounded-2xl">
                <ArrowRightLeft className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Shift & Merge Projects</h3>
                <p className="text-xs text-slate-500">Reassign workforce and geofences seamlessly across sites</p>
              </div>
            </div>

            <form onSubmit={handleExecuteShiftMerge} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Source Project (From)</label>
                  <select
                    value={shiftSourceSiteId}
                    onChange={(e) => setShiftSourceSiteId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium"
                  >
                    <option value="">Select source...</option>
                    {sites.map((s) => (
                      <option key={s.siteId} value={s.siteId}>
                        {s.siteName} ({s.siteId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Target Project (To)</label>
                  <select
                    value={shiftTargetSiteId}
                    onChange={(e) => setShiftTargetSiteId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium"
                  >
                    <option value="">Select target...</option>
                    {sites
                      .filter((s) => s.siteId !== shiftSourceSiteId && s.isActive)
                      .map((s) => (
                        <option key={s.siteId} value={s.siteId}>
                          {s.siteName} ({s.siteId})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={migrateEmployees}
                    onChange={(e) => setMigrateEmployees(e.target.checked)}
                    className="w-4 h-4 text-slate-900 rounded-sm"
                  />
                  <span className="font-semibold text-slate-800">
                    Reassign all workforce members from source to target site
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={migrateLocations}
                    onChange={(e) => setMigrateLocations(e.target.checked)}
                    className="w-4 h-4 text-slate-900 rounded-sm"
                  />
                  <span className="font-semibold text-slate-800">
                    Reassign all geofence locations to target site
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deactivateSource}
                    onChange={(e) => setDeactivateSource(e.target.checked)}
                    className="w-4 h-4 text-slate-900 rounded-sm"
                  />
                  <span className="font-semibold text-slate-800">
                    Deactivate source project after migration
                  </span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowShiftMergeModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition flex items-center space-x-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>{loading ? 'Executing Shift...' : 'Confirm Shift & Merge'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Site Modal */}
      {showEditSiteModal && editingSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl relative">
            <button
              onClick={() => setShowEditSiteModal(false)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Edit Project Site</h3>
            <p className="text-xs text-slate-500 font-mono mb-4">Site ID: {editingSite.siteId}</p>

            <form onSubmit={handleUpdateSite} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Site Name</label>
                <input
                  type="text"
                  value={editSiteName}
                  onChange={(e) => setEditSiteName(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editSiteActive}
                    onChange={(e) => setEditSiteActive(e.target.checked)}
                    className="w-4 h-4 text-slate-900 rounded-sm"
                  />
                  <span className="font-semibold text-slate-800">Project Site is Active</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditSiteModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditLocationModal && editingLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl relative">
            <button
              onClick={() => setShowEditLocationModal(false)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Geofence Location</h3>

            <form onSubmit={handleUpdateLocation} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Parent Project Site</label>
                <select
                  value={editLocSiteId}
                  onChange={(e) => setEditLocSiteId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium"
                >
                  {sites.map((s) => (
                    <option key={s.siteId} value={s.siteId}>
                      {s.siteName} ({s.siteId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Location Name</label>
                <input
                  type="text"
                  value={editLocName}
                  onChange={(e) => setEditLocName(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={editLocAddress}
                  onChange={(e) => setEditLocAddress(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editLocLat}
                    onChange={(e) => setEditLocLat(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editLocLng}
                    onChange={(e) => setEditLocLng(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Geofence Radius (Meters)</label>
                  <input
                    type="number"
                    value={editLocRadius}
                    onChange={(e) => setEditLocRadius(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Max GPS Accuracy (Meters)</label>
                  <input
                    type="number"
                    value={editLocAccuracyThreshold}
                    onChange={(e) => setEditLocAccuracyThreshold(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditLocationModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
                >
                  {loading ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Site Drilldown Modal */}
      {selectedSiteForDrilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedSiteForDrilldown(null)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-slate-900 text-white rounded-2xl">
                <Building2 className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedSiteForDrilldown.siteName}</h3>
                <span className="font-mono text-xs text-slate-500">ID: {selectedSiteForDrilldown.siteId}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Total Geofences Under Site</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedSiteForDrilldown.siteLocations?.length || 0} Registered Gates/Points
                  </span>
                </div>
                <button
                  onClick={() => {
                    openAddLocationForSite(selectedSiteForDrilldown.siteId);
                    setSelectedSiteForDrilldown(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Location</span>
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedSiteForDrilldown.siteLocations?.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No physical geofences configured under this site yet.
                  </div>
                ) : (
                  selectedSiteForDrilldown.siteLocations.map((loc: any) => (
                    <div
                      key={loc.locationId || loc.id}
                      className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{loc.locationName || loc.name}</span>
                        </div>
                        <p className="text-slate-500 text-[11px]">{loc.address || 'Standard physical perimeter'}</p>
                        <div className="font-mono text-[10px] text-slate-400">
                          {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                        </div>
                      </div>
                      <div className="text-right space-y-1 shrink-0">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full font-mono text-[10px] font-bold text-slate-700">
                          {loc.radiusMeters}m Geofence
                        </span>
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          Max Acc: {loc.accuracyThresholdMeters || 100}m
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedSiteForDrilldown(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-800 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Site Modal */}
      {showAddSiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-xl relative">
            <button
              onClick={() => setShowAddSiteModal(false)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Project Site (Multi-Site)</h3>

            <form onSubmit={handleCreateSite} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Site ID (Optional, Unique)</label>
                <input
                  type="text"
                  value={newSiteId}
                  onChange={(e) => setNewSiteId(e.target.value)}
                  placeholder="e.g. SITE_PUNE_01"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Site Name</label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="e.g. Pune Metro Construction Site"
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddSiteModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
                >
                  {loading ? 'Creating...' : 'Create Project Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 text-slate-900">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl relative">
            <button
              onClick={() => setShowAddLocationModal(false)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Geofence Location</h3>

            <form onSubmit={handleCreateLocation} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Parent Project Site</label>
                <select
                  value={locSiteId}
                  onChange={(e) => setLocSiteId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium"
                >
                  {sites.map((s) => (
                    <option key={s.siteId} value={s.siteId}>
                      {s.siteName} ({s.siteId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Location Name</label>
                <input
                  type="text"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="e.g. Pune Site Gate 2 Office"
                  required
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={locAddress}
                  onChange={(e) => setLocAddress(e.target.value)}
                  placeholder="e.g. Shivaji Nagar, Pune, Maharashtra 411005"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={locLat}
                    onChange={(e) => setLocLat(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={locLng}
                    onChange={(e) => setLocLng(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Geofence Radius (Meters)</label>
                  <input
                    type="number"
                    value={locRadius}
                    onChange={(e) => setLocRadius(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Max GPS Accuracy (Meters)</label>
                  <input
                    type="number"
                    value={locAccuracyThreshold}
                    onChange={(e) => setLocAccuracyThreshold(e.target.value)}
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddLocationModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition"
                >
                  {loading ? 'Adding Location...' : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
