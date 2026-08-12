import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

const app =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createAuth(): Auth {
  /*
   * Next.js build / server tarafında browser persistence API'lerini
   * başlatmıyoruz. Browser veya Capacitor WebView tarafında ise Auth'u
   * açıkça kalıcı storage ile başlatıyoruz.
   */
  if (typeof window === "undefined") {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
      ],
    });
  } catch {
    /*
     * Hot reload veya başka bir import Auth'u daha önce başlattıysa
     * mevcut instance'ı kullan.
     */
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;