import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'milestone-attendance';

let appInstance;
if (!getApps().length) {
  const serviceAccountKeyRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKeyRaw) {
    try {
      let parsedJson: any;
      const trimmed = serviceAccountKeyRaw.trim();

      if (trimmed.startsWith('{')) {
        parsedJson = JSON.parse(trimmed);
      } else {
        // Attempt base64 decode if not plain JSON
        try {
          const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
          parsedJson = JSON.parse(decoded);
        } catch {
          parsedJson = JSON.parse(trimmed);
        }
      }

      // Safely restore multiline private key if escaped
      if (parsedJson.private_key && typeof parsedJson.private_key === 'string') {
        parsedJson.private_key = parsedJson.private_key.replace(/\\n/g, '\n');
      }

      appInstance = initializeApp({
        credential: cert(parsedJson),
        projectId: parsedJson.project_id || projectId,
      });
      console.log(`[Firebase Admin] Initialized with Service Account credentials for project: ${parsedJson.project_id || projectId}`);
    } catch (e: any) {
      console.warn(`[Firebase Admin] Failed parsing FIREBASE_SERVICE_ACCOUNT_KEY, falling back to ADC/Project:`, e.message);
      try {
        appInstance = initializeApp({
          credential: applicationDefault(),
          projectId,
        });
      } catch {
        appInstance = initializeApp({ projectId });
      }
    }
  } else {
    // In local development or Cloud Run container:
    // If no credentials explicitly set, try applicationDefault or standard initialization
    try {
      appInstance = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    } catch {
      appInstance = initializeApp({ projectId });
    }
    console.log(`[Firebase Admin] Initialized with default credential for project: ${projectId}`);
  }
} else {
  appInstance = getApp();
}

export const adminDb = getFirestore(appInstance);
try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch {}

export const adminAuth = getAuth(appInstance);

