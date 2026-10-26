import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

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

export const fixturesEnabled = import.meta.env.VITE_ENABLE_FIXTURES === "true";
const emulatorsEnabled = import.meta.env.VITE_USE_EMULATORS === "true";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let loaded = false;
let loading: Promise<void> | null = null;

export function firebaseLoaded() {
  return loaded;
}

export function firebaseAuth(): Auth | null {
  return auth;
}

export function firestore(): Firestore | null {
  return db;
}

function emulatorHost() {
  if (typeof window === "undefined") return "127.0.0.1";
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return host;
  return "127.0.0.1";
}

// The Firebase SDK is a separate download so public pages can render first.
export function loadFirebase() {
  if (!firebaseConfigured) {
    loaded = true;
    return Promise.resolve();
  }
  if (!loading) {
    loading = boot()
      .catch((error: unknown) => {
        console.error(error);
      })
      .finally(() => {
        loaded = true;
      });
  }
  return loading;
}

async function boot() {
  const { getApp, getApps, initializeApp } = await import("firebase/app");
  const { connectAuthEmulator, getAuth } = await import("firebase/auth");
  const {
    connectFirestoreEmulator,
    getFirestore,
    initializeFirestore,
    memoryLocalCache,
    persistentLocalCache,
    persistentMultipleTabManager,
  } = await import("firebase/firestore");

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  try {
    db = initializeFirestore(app, {
      localCache: emulatorsEnabled
        ? memoryLocalCache()
        : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    db = getFirestore(app);
  }

  if (!emulatorsEnabled) return;
  const host = emulatorHost();
  try {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
  } catch {
    // The emulators are already connected after a hot reload.
  }
}
