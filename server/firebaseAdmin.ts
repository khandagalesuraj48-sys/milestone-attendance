import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const defaultProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'milestone-attendance';

interface AdminDiagnostics {
  serviceAccountEnvExists: boolean;
  serviceAccountEnvLength: number;
  parseStatus: 'SUCCESS' | 'FAILED' | 'NOT_PROVIDED';
  parseErrorMessage: string | null;
  detectedProjectId: string;
  hasPrivateKey: boolean;
  hasClientEmail: boolean;
  initMode: 'SERVICE_ACCOUNT' | 'APPLICATION_DEFAULT' | 'PROJECT_ONLY';
  initErrorMessage: string | null;
}

const diagnostics: AdminDiagnostics = {
  serviceAccountEnvExists: false,
  serviceAccountEnvLength: 0,
  parseStatus: 'NOT_PROVIDED',
  parseErrorMessage: null,
  detectedProjectId: defaultProjectId,
  hasPrivateKey: false,
  hasClientEmail: false,
  initMode: 'PROJECT_ONLY',
  initErrorMessage: null,
};

let appInstance: any;

if (!getApps().length) {
  const serviceAccountKeyRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKeyRaw && serviceAccountKeyRaw.trim().length > 0) {
    diagnostics.serviceAccountEnvExists = true;
    diagnostics.serviceAccountEnvLength = serviceAccountKeyRaw.trim().length;

    try {
      let parsedJson: any;
      let rawStr = serviceAccountKeyRaw.trim();

      // Handle cases where environment variable is wrapped in outer quotes
      if ((rawStr.startsWith('"') && rawStr.endsWith('"')) || (rawStr.startsWith("'") && rawStr.endsWith("'"))) {
        rawStr = rawStr.slice(1, -1).trim();
      }

      if (rawStr.startsWith('{')) {
        parsedJson = JSON.parse(rawStr);
      } else {
        // Attempt base64 decode if not plain JSON
        try {
          const decoded = Buffer.from(rawStr, 'base64').toString('utf-8');
          parsedJson = JSON.parse(decoded);
        } catch {
          parsedJson = JSON.parse(rawStr);
        }
      }

      diagnostics.hasPrivateKey = !!parsedJson.private_key;
      diagnostics.hasClientEmail = !!parsedJson.client_email;
      if (parsedJson.project_id) {
        diagnostics.detectedProjectId = parsedJson.project_id;
      }

      // Safely restore multiline private key if escaped
      if (parsedJson.private_key && typeof parsedJson.private_key === 'string') {
        parsedJson.private_key = parsedJson.private_key.replace(/\\n/g, '\n');
      }

      appInstance = initializeApp({
        credential: cert(parsedJson),
        projectId: parsedJson.project_id || defaultProjectId,
      });

      diagnostics.parseStatus = 'SUCCESS';
      diagnostics.initMode = 'SERVICE_ACCOUNT';
      console.log(`[Firebase Admin] Successfully initialized with Service Account credentials for project: ${diagnostics.detectedProjectId}`);
    } catch (e: any) {
      diagnostics.parseStatus = 'FAILED';
      diagnostics.parseErrorMessage = e?.message || 'Unknown parsing error';
      console.warn(`[Firebase Admin] Failed parsing FIREBASE_SERVICE_ACCOUNT_KEY (${e?.message}), attempting fallback...`);

      try {
        appInstance = initializeApp({
          credential: applicationDefault(),
          projectId: defaultProjectId,
        });
        diagnostics.initMode = 'APPLICATION_DEFAULT';
      } catch (appDefErr: any) {
        diagnostics.initErrorMessage = appDefErr?.message || 'ADC failed';
        appInstance = initializeApp({ projectId: defaultProjectId });
        diagnostics.initMode = 'PROJECT_ONLY';
      }
    }
  } else {
    diagnostics.serviceAccountEnvExists = false;
    diagnostics.parseStatus = 'NOT_PROVIDED';

    try {
      appInstance = initializeApp({
        credential: applicationDefault(),
        projectId: defaultProjectId,
      });
      diagnostics.initMode = 'APPLICATION_DEFAULT';
    } catch (appDefErr: any) {
      diagnostics.initErrorMessage = appDefErr?.message || 'ADC failed';
      appInstance = initializeApp({ projectId: defaultProjectId });
      diagnostics.initMode = 'PROJECT_ONLY';
    }
    console.log(`[Firebase Admin] Initialized with mode ${diagnostics.initMode} for project: ${defaultProjectId}`);
  }
} else {
  appInstance = getApp();
}

export const adminDb = getFirestore(appInstance);
try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch {}

export const adminAuth = getAuth(appInstance);

export function getFirebaseAdminDiagnostics(): AdminDiagnostics {
  return { ...diagnostics };
}

