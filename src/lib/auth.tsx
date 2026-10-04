import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role, SelfServeRole, UserRecord } from "../types/domain";
import { firebaseAuth, firebaseConfigured, firestore } from "./firebase";

type AuthState = {
  ready: boolean;
  configured: boolean;
  user: User | null;
  profile: UserRecord | null;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (email: string, password: string) => Promise<void>;
  chooseRole: (role: SelfServeRole, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!firebaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserRecord | null>(null);

  useEffect(() => {
    const auth = firebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, async (next) => {
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
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      configured: firebaseConfigured,
      user,
      profile,
      async signInWithGoogle() {
        const auth = firebaseAuth();
        if (!auth) throw new Error("Firebase is not configured.");
        await signInWithPopup(auth, new GoogleAuthProvider());
      },
      async signInWithPassword(email, password) {
        const auth = firebaseAuth();
        if (!auth) throw new Error("Firebase is not configured.");
        await signInWithEmailAndPassword(auth, email, password);
      },
      async registerWithPassword(email, password) {
        const auth = firebaseAuth();
        if (!auth) throw new Error("Firebase is not configured.");
        await createUserWithEmailAndPassword(auth, email, password);
      },
      async chooseRole(role, displayName) {
        const auth = firebaseAuth();
        const db = firestore();
        const current = auth?.currentUser;
        if (!auth || !db || !current) throw new Error("Sign in before choosing a role.");
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
      async logout() {
        const auth = firebaseAuth();
        if (!auth) return;
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
