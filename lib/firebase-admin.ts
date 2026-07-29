import {
  cert,
  
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ?.replace(/\\n/g, "\n")
  .trim();

if (!projectId) {
  throw new Error(
    "FIREBASE_ADMIN_PROJECT_ID ortam değişkeni tanımlı değil.",
  );
}

if (!clientEmail) {
  throw new Error(
    "FIREBASE_ADMIN_CLIENT_EMAIL ortam değişkeni tanımlı değil.",
  );
}

if (!privateKey) {
  throw new Error(
    "FIREBASE_ADMIN_PRIVATE_KEY ortam değişkeni tanımlı değil.",
  );
}

const ADMIN_APP_NAME = "alqev-firebase-admin";

const existingAdminApp = getApps().find(
  (app) => app.name === ADMIN_APP_NAME,
);

const adminApp: App =
  existingAdminApp ??
  initializeApp(
    {
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    },
    ADMIN_APP_NAME,
  );

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);