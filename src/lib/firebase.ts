import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

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
let emulatorsReady = false;

export const fixturesEnabled = import.meta.env.VITE_ENABLE_FIXTURES === "true";
const emulatorsEnabled = import.meta.env.VITE_USE_EMULATORS === "true";

export function firebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

function emulatorHost() {
  if (typeof window === "undefined") return "127.0.0.1";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return host;
  return "127.0.0.1";
}

function useLocalEmulators(auth: Auth, db: Firestore) {
  if (!emulatorsEnabled || emulatorsReady) return;
  const host = emulatorHost();
  try {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
  } catch {
    // The emulators are already connected after a hot reload.
  }
  emulatorsReady = true;
}

export function firebaseAuth(): Auth | null {
  const instance = firebaseApp();
  if (!instance) return null;
  const auth = getAuth(instance);
  useLocalEmulators(auth, getFirestore(instance));
  return auth;
}

export function firestore(): Firestore | null {
  const instance = firebaseApp();
  if (!instance) return null;
  const db = getFirestore(instance);
  useLocalEmulators(getAuth(instance), db);
  return db;
}
