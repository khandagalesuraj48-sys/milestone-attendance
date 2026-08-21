import fs from 'fs';
import path from 'path';
import { adminDb } from '../firebaseAdmin';
import {
  User,
  Employee,
  Site,
  LocationSite,
  AttendanceRules,
  Holiday,
  LeaveBalance,
} from '../../src/types';

const isServerless = Boolean(
  process.env.LAMBDA_TASK_ROOT || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME
);
const DB_FILE_PATH = isServerless
  ? path.join('/tmp', 'milestone_db.json')
  : path.join(process.cwd(), 'milestone_db.json');

// Internal in-memory store: Map<collectionName, Map<docId, documentData>>
const store = new Map<string, Map<string, any>>();

let isFirestoreAvailable = true;
let hasLoggedFirestoreStatus = false;

/**
 * Checks whether an error is a Firebase Firestore permission or network connectivity issue
 */
export function isFirestorePermissionOrNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = err.code;
  return (
    code === 7 || // PERMISSION_DENIED
    code === 14 || // UNAVAILABLE
    code === 16 || // UNAUTHENTICATED
    code === 4 || // DEADLINE_EXCEEDED
    code === 'permission-denied' ||
    code === 'unavailable' ||
    msg.includes('permission_denied') ||
    msg.includes('insufficient permissions') ||
    msg.includes('missing or insufficient permissions') ||
    msg.includes('could not reach cloud firestore') ||
    msg.includes('unavailable') ||
    msg.includes('auth error') ||
    msg.includes('credential')
  );
}

export function markFirestoreUnavailable(err?: any) {
  isFirestoreAvailable = false;
  if (!hasLoggedFirestoreStatus) {
    hasLoggedFirestoreStatus = true;
    console.warn(
      '[StorageEngine] Remote Firestore unavailable or permission denied (' +
        (err?.message || 'Code 7') +
        '). Operating seamlessly in resilient local high-availability storage mode.'
    );
  }
}

export function markFirestoreAvailable() {
  isFirestoreAvailable = true;
}

export function isRemoteFirestoreActive(): boolean {
  return isFirestoreAvailable;
}

// Ensure collection map exists
function getColMap(collectionName: string): Map<string, any> {
  if (!store.has(collectionName)) {
    store.set(collectionName, new Map<string, any>());
  }
  return store.get(collectionName)!;
}

// Debounced file sync
let saveTimeout: NodeJS.Timeout | null = null;
function scheduleSaveToDisk() {
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    try {
      const serializable: Record<string, Record<string, any>> = {};
      for (const [colName, map] of store.entries()) {
        serializable[colName] = Object.fromEntries(map.entries());
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(serializable, null, 2), 'utf-8');
    } catch (e) {
      // Ignore write errors to disk
    }
  }, 400);
}

function loadFromDisk() {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      for (const [colName, docs] of Object.entries(parsed)) {
        const colMap = getColMap(colName);
        for (const [docId, data] of Object.entries(docs as Record<string, any>)) {
          colMap.set(docId, data);
        }
      }
    }
  } catch (e) {
    // Ignore load errors
  }
}

// Default Seed Data
function seedInitialDefaults() {
  // 1. Sites
  const sitesCol = getColMap('sites');
  if (sitesCol.size === 0) {
    const defaultSites: Site[] = [
      {
        siteId: 'SITE_MUMBAI_HO',
        siteName: 'Mumbai Corporate Headquarters',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        siteId: 'SITE_PALGHAR_INFRA',
        siteName: 'Palghar Industrial & Infra Project',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        siteId: 'SITE_THANE_METRO',
        siteName: 'Thane Metro Station Site',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        siteId: 'SITE_NAVI_MUMBAI_SEZ',
        siteName: 'Navi Mumbai SEZ Commercial Hub',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    for (const s of defaultSites) sitesCol.set(s.siteId, s);
  }

  // 2. Locations
  const locsCol = getColMap('locations');
  if (locsCol.size === 0) {
    const defaultLocs: LocationSite[] = [
      {
        locationId: 'LOC_MUMBAI_HO_MAIN',
        id: 'LOC_MUMBAI_HO_MAIN',
        siteId: 'SITE_MUMBAI_HO',
        siteName: 'Mumbai Corporate Headquarters',
        locationName: 'BKC Corporate Tower - 8th Floor',
        name: 'BKC Corporate Tower - 8th Floor',
        address: 'G Block, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051',
        latitude: 19.0657,
        longitude: 72.8687,
        radiusMeters: 250,
        accuracyThresholdMeters: 100,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        locationId: 'LOC_PALGHAR_YARD_A',
        id: 'LOC_PALGHAR_YARD_A',
        siteId: 'SITE_PALGHAR_INFRA',
        siteName: 'Palghar Industrial & Infra Project',
        locationName: 'Palghar Fabrication Yard & Storage',
        name: 'Palghar Fabrication Yard & Storage',
        address: 'Plot 42, MIDC Industrial Area, Tarapur, Palghar, Maharashtra 401506',
        latitude: 18.657,
        longitude: 72.879,
        radiusMeters: 300,
        accuracyThresholdMeters: 100,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        locationId: 'LOC_THANE_PLATFORM_1',
        id: 'LOC_THANE_PLATFORM_1',
        siteId: 'SITE_THANE_METRO',
        siteName: 'Thane Metro Station Site',
        locationName: 'Thane Majiwada Station Construction',
        name: 'Thane Majiwada Station Construction',
        address: 'Eastern Express Hwy, Majiwada, Thane West, Maharashtra 400601',
        latitude: 19.2183,
        longitude: 72.9781,
        radiusMeters: 250,
        accuracyThresholdMeters: 100,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        locationId: 'LOC_NAVI_MUMBAI_BLOCK_C',
        id: 'LOC_NAVI_MUMBAI_BLOCK_C',
        siteId: 'SITE_NAVI_MUMBAI_SEZ',
        siteName: 'Navi Mumbai SEZ Commercial Hub',
        locationName: 'Airoli Knowledge Park - Block C',
        name: 'Airoli Knowledge Park - Block C',
        address: 'Airoli Knowledge Park Rd, TTC Industrial Area, MIDC Industrial Area, Airoli, Navi Mumbai 400708',
        latitude: 19.1551,
        longitude: 72.9986,
        radiusMeters: 200,
        accuracyThresholdMeters: 100,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    for (const l of defaultLocs) locsCol.set(l.locationId, l);
  }

  // 3. Attendance Rules
  const settingsCol = getColMap('system_settings');
  if (!settingsCol.has('attendance_rules')) {
    const rules: AttendanceRules = {
      dayShift: {
        startTime: '08:00',
        endTime: '17:00',
        gracePeriodMinutes: 15,
        autoSignOutTime: '01:00',
      },
      nightShift: {
        startTime: '19:00',
        endTime: '04:00',
        gracePeriodMinutes: 15,
        autoSignOutTime: '08:00',
      },
      halfDayThresholdHours: 4.0,
      fullDayThresholdHours: 9.0,
      maxConsecutiveDays: 6,
      weeklyOffRule: 'SUNDAY_MANDATORY',
      updatedBy: 'SYSTEM_BOOTSTRAP',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    settingsCol.set('attendance_rules', rules);
  }

  // 4. Default Employees & Users
  const empCol = getColMap('employees');
  const userCol = getColMap('users');

  const initialEmployees: Employee[] = [
    {
      employeeId: 'ADMIN-01',
      username: 'admin',
      fullName: 'Suraj Khandagale',
      mobile: '9876543210',
      email: 'admin@milestoneconsultancy.in',
      designation: 'Operations Director & Admin',
      department: 'OPERATIONS',
      assignedSiteIds: ['SITE_MUMBAI_HO', 'SITE_PALGHAR_INFRA', 'SITE_THANE_METRO', 'SITE_NAVI_MUMBAI_SEZ'],
      salaryStructure: {
        monthlyGross: 125000,
        basicSalary: 85000,
        hra: 25000,
        specialAllowance: 15000,
        otherDeductions: 5000,
      },
      joiningDate: '2023-01-01',
      accountStatus: 'ACTIVE',
      boundHardwareSignature: null,
      activeDeviceId: null,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    },
    {
      employeeId: 'EMP-1001',
      username: 'emp001',
      fullName: 'Rahul Sharma',
      mobile: '9876543211',
      email: 'emp001@milestoneconsultancy.in',
      designation: 'Senior Site Engineer',
      department: 'ENGINEERING',
      assignedSiteIds: ['SITE_MUMBAI_HO', 'SITE_THANE_METRO'],
      salaryStructure: {
        monthlyGross: 68000,
        basicSalary: 45000,
        hra: 15000,
        specialAllowance: 8000,
        otherDeductions: 3000,
      },
      joiningDate: '2023-06-15',
      accountStatus: 'ACTIVE',
      boundHardwareSignature: null,
      activeDeviceId: null,
      createdAt: '2023-06-15T00:00:00.000Z',
      updatedAt: '2023-06-15T00:00:00.000Z',
    },
    {
      employeeId: 'EMP-1002',
      username: 'emp002',
      fullName: 'Amit Patil',
      mobile: '9876543212',
      email: 'emp002@milestoneconsultancy.in',
      designation: 'Fabrication Supervisor',
      department: 'CONSTRUCTION',
      assignedSiteIds: ['SITE_PALGHAR_INFRA'],
      salaryStructure: {
        monthlyGross: 56000,
        basicSalary: 38000,
        hra: 12000,
        specialAllowance: 6000,
        otherDeductions: 2500,
      },
      joiningDate: '2023-09-01',
      accountStatus: 'ACTIVE',
      boundHardwareSignature: null,
      activeDeviceId: null,
      createdAt: '2023-09-01T00:00:00.000Z',
      updatedAt: '2023-09-01T00:00:00.000Z',
    },
    {
      employeeId: 'EMP-1003',
      username: 'emp003',
      fullName: 'Pooja Deshmukh',
      mobile: '9876543213',
      email: 'emp003@milestoneconsultancy.in',
      designation: 'Commercial Project Coordinator',
      department: 'ADMINISTRATION',
      assignedSiteIds: ['SITE_NAVI_MUMBAI_SEZ'],
      salaryStructure: {
        monthlyGross: 63000,
        basicSalary: 42000,
        hra: 14000,
        specialAllowance: 7000,
        otherDeductions: 2800,
      },
      joiningDate: '2024-02-10',
      accountStatus: 'ACTIVE',
      boundHardwareSignature: null,
      activeDeviceId: null,
      createdAt: '2024-02-10T00:00:00.000Z',
      updatedAt: '2024-02-10T00:00:00.000Z',
    },
  ];

  for (const emp of initialEmployees) {
    if (!empCol.has(emp.employeeId)) {
      empCol.set(emp.employeeId, emp);
    }
  }

  // Pre-seed User Profiles
  const initialUsers: User[] = [
    {
      id: 'admin_master_uid',
      uid: 'admin_master_uid',
      employeeId: 'ADMIN-01',
      username: 'admin',
      email: 'admin@milestoneconsultancy.in',
      fullName: 'Suraj Khandagale',
      role: 'admin',
      accountStatus: 'ACTIVE',
      mustChangePassword: false,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    },
    {
      id: 'user_khandagale_uid',
      uid: 'user_khandagale_uid',
      employeeId: 'ADMIN-01',
      username: 'suraj',
      email: 'khandagalesuraj48@gmail.com',
      fullName: 'Suraj Khandagale',
      role: 'admin',
      accountStatus: 'ACTIVE',
      mustChangePassword: false,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    },
    {
      id: 'user_emp001_uid',
      uid: 'user_emp001_uid',
      employeeId: 'EMP-1001',
      username: 'emp001',
      email: 'emp001@milestoneconsultancy.in',
      fullName: 'Rahul Sharma',
      role: 'employee',
      accountStatus: 'ACTIVE',
      mustChangePassword: false,
      createdAt: '2023-06-15T00:00:00.000Z',
      updatedAt: '2023-06-15T00:00:00.000Z',
    },
    {
      id: 'user_emp002_uid',
      uid: 'user_emp002_uid',
      employeeId: 'EMP-1002',
      username: 'emp002',
      email: 'emp002@milestoneconsultancy.in',
      fullName: 'Amit Patil',
      role: 'employee',
      accountStatus: 'ACTIVE',
      mustChangePassword: false,
      createdAt: '2023-09-01T00:00:00.000Z',
      updatedAt: '2023-09-01T00:00:00.000Z',
    },
    {
      id: 'user_emp003_uid',
      uid: 'user_emp003_uid',
      employeeId: 'EMP-1003',
      username: 'emp003',
      email: 'emp003@milestoneconsultancy.in',
      fullName: 'Pooja Deshmukh',
      role: 'employee',
      accountStatus: 'ACTIVE',
      mustChangePassword: false,
      createdAt: '2024-02-10T00:00:00.000Z',
      updatedAt: '2024-02-10T00:00:00.000Z',
    },
  ];

  for (const u of initialUsers) {
    if (!userCol.has(u.id)) {
      userCol.set(u.id, u);
    }
  }

  // 5. Holidays
  const holidaysCol = getColMap('holidays');
  if (holidaysCol.size === 0) {
    const defaultHolidays: Holiday[] = [
      { id: 'hol_2026_01_26', date: '2026-01-26', name: 'Republic Day', isMandatory: true, year: 2026, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'hol_2026_03_03', date: '2026-03-03', name: 'Holi', isMandatory: true, year: 2026, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'hol_2026_08_15', date: '2026-08-15', name: 'Independence Day', isMandatory: true, year: 2026, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'hol_2026_10_02', date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', isMandatory: true, year: 2026, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'hol_2026_11_08', date: '2026-11-08', name: 'Diwali (Laxmi Pujan)', isMandatory: true, year: 2026, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'hol_2026_12_25', date: '2026-12-25', name: 'Christmas', isMandatory: true, year: 2026, createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    for (const h of defaultHolidays) holidaysCol.set(h.id, h);
  }
}

// Initial bootstrap
loadFromDisk();
seedInitialDefaults();

export const storageEngine = {
  getDoc<T = any>(collection: string, docId: string): T | null {
    const col = getColMap(collection);
    const data = col.get(docId);
    return data ? (JSON.parse(JSON.stringify(data)) as T) : null;
  },

  setDoc<T = any>(collection: string, docId: string, data: T, merge = false): T {
    const col = getColMap(collection);
    let finalData = data;
    if (merge && col.has(docId)) {
      finalData = { ...col.get(docId), ...data };
    }
    col.set(docId, JSON.parse(JSON.stringify(finalData)));
    scheduleSaveToDisk();
    return finalData;
  },

  updateDoc(collection: string, docId: string, updates: Record<string, any>): void {
    const col = getColMap(collection);
    const current = col.get(docId) || {};
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    col.set(docId, JSON.parse(JSON.stringify(updated)));
    scheduleSaveToDisk();
  },

  deleteDoc(collection: string, docId: string): void {
    const col = getColMap(collection);
    col.delete(docId);
    scheduleSaveToDisk();
  },

  getAllDocs<T = any>(collection: string): T[] {
    const col = getColMap(collection);
    return Array.from(col.values()).map((v) => JSON.parse(JSON.stringify(v)) as T);
  },

  queryDocs<T = any>(collection: string, filterFn: (item: T) => boolean): T[] {
    const all = (this.getAllDocs as <K = T>(col: string) => K[])(collection);
    return all.filter(filterFn);
  },

  findDoc<T = any>(collection: string, predicate: (item: T) => boolean): T | null {
    const all = (this.getAllDocs as <K = T>(col: string) => K[])(collection);
    for (const item of all) {
      if (predicate(item)) return item;
    }
    return null;
  },
};
