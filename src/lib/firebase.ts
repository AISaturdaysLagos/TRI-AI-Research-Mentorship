import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

let app: FirebaseApp | null = null;

export function firebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

export function firebaseAuth(): Auth | null {
  const instance = firebaseApp();
  return instance ? getAuth(instance) : null;
}

export function firestore(): Firestore | null {
  const instance = firebaseApp();
  return instance ? getFirestore(instance) : null;
}
