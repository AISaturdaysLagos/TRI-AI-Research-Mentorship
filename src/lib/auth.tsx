import type { User } from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role, SelfServeRole, UserRecord } from "../types/domain";
import { firebaseAuth, firebaseConfigured, firestore, loadFirebase } from "./firebase";

type AuthState = {
  ready: boolean;
  configured: boolean;
  user: User | null;
  profile: UserRecord | null;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (email: string, password: string) => Promise<void>;
  chooseRole: (role: SelfServeRole, displayName: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function authClient() {
  await loadFirebase();
  const auth = firebaseAuth();
  if (!auth) throw new Error("This is unavailable right now.");
  return auth;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!firebaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserRecord | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    let unsubscribe = () => {};
    let cancel = false;
    loadFirebase()
      .then(async () => {
        if (cancel) return;
        const { onAuthStateChanged } = await import("firebase/auth");
        const auth = firebaseAuth();
        if (!auth) {
          setReady(true);
          return;
        }
        unsubscribe = onAuthStateChanged(auth, async (next) => {
          setUser(next);
          if (!next) {
            setProfile(null);
            setReady(true);
            return;
          }
          const db = firestore();
          if (!db) {
            setReady(true);
            return;
          }
          const { doc, getDoc } = await import("firebase/firestore");
          const snapshot = await getDoc(doc(db, "users", next.uid));
          if (snapshot.exists()) {
            const data = snapshot.data();
            setProfile({
              email: String(data.email ?? next.email ?? ""),
              displayName: String(data.displayName ?? next.displayName ?? ""),
              role: data.role as Role,
            });
          } else {
            setProfile(null);
          }
          setReady(true);
        });
      })
      .catch(() => {
        if (!cancel) setReady(true);
      });
    return () => {
      cancel = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      configured: firebaseConfigured,
      user,
      profile,
      async signInWithGoogle() {
        const auth = await authClient();
        const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
        await signInWithPopup(auth, new GoogleAuthProvider());
      },
      async signInWithPassword(email, password) {
        const auth = await authClient();
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        await signInWithEmailAndPassword(auth, email, password);
      },
      async registerWithPassword(email, password) {
        const auth = await authClient();
        const { createUserWithEmailAndPassword } = await import("firebase/auth");
        await createUserWithEmailAndPassword(auth, email, password);
      },
      async chooseRole(role, displayName) {
        const auth = await authClient();
        const db = firestore();
        const current = auth.currentUser;
        if (!db || !current) throw new Error("Sign in before choosing a role.");
        const { doc, serverTimestamp, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db, "users", current.uid), {
          email: current.email ?? "",
          displayName: displayName || current.displayName || "",
          role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setProfile({
          email: current.email ?? "",
          displayName: displayName || current.displayName || "",
          role,
        });
      },
      async updateDisplayName(displayName) {
        const auth = await authClient();
        const db = firestore();
        const current = auth.currentUser;
        if (!db || !current || !profile) throw new Error("Sign in before updating your account.");
        const name = displayName.trim();
        const { updateProfile } = await import("firebase/auth");
        const { doc, serverTimestamp, setDoc } = await import("firebase/firestore");
        await updateProfile(current, { displayName: name });
        await setDoc(
          doc(db, "users", current.uid),
          { displayName: name, updatedAt: serverTimestamp() },
          { merge: true },
        );
        setProfile({ ...profile, displayName: name });
      },
      async logout() {
        const auth = firebaseAuth();
        if (!auth) return;
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
      },
    }),
    [profile, ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
