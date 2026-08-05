import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function getServiceAccount(): FirebaseServiceAccount {
  const encoded =
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64?.trim();

  if (!encoded) {
    throw new Error(
      "FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 ortam değişkeni tanımlı değil.",
    );
  }

  try {
    const decodedJson = Buffer.from(encoded, "base64").toString("utf8");
    const serviceAccount = JSON.parse(
      decodedJson,
    ) as FirebaseServiceAccount;

    if (
      !serviceAccount.project_id ||
      !serviceAccount.client_email ||
      !serviceAccount.private_key
    ) {
      throw new Error("Servis hesabı bilgileri eksik.");
    }

    return serviceAccount;
  } catch (error) {
    console.error("Firebase servis hesabı okunamadı:", error);

    throw new Error(
      "Firebase servis hesabı Base64 değeri geçersiz.",
    );
  }
}

const serviceAccount = getServiceAccount();
const ADMIN_APP_NAME = "alqev-firebase-admin";

const existingAdminApp = getApps().find(
  (app) => app.name === ADMIN_APP_NAME,
);

const adminApp: App =
  existingAdminApp ??
  initializeApp(
    {
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
      projectId: serviceAccount.project_id,
    },
    ADMIN_APP_NAME,
  );

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);