"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  updateProfile as fbUpdateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface AppUser {
  uid: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  // Convenience aliases kept for existing component compatibility
  email: string | null;
  name: string | null;
  token: null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;

  // Profile updates
  updateDisplayName: (name: string) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  changeEmail: (currentPassword: string, newEmail: string) => Promise<{ ok: boolean; error?: string }>;

  // Legacy alias used in settings/change-email pages
  updateProfile: (updates: { name?: string; email?: string }) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Fetch the user's Firestore profile and merge with Firebase Auth data */
async function buildAppUser(fbUser: FirebaseUser): Promise<AppUser> {
  try {
    const snap = await getDoc(doc(db, "users", fbUser.uid));
    const data = snap.data();
    return {
      uid: fbUser.uid,
      name: fbUser.displayName ?? data?.name ?? "User",
      email: fbUser.email ?? "",
      emailVerified: fbUser.emailVerified,
    };
  } catch {
    // Doc may not exist yet (race during signup) — fall back to Auth data only
    return {
      uid: fbUser.uid,
      name: fbUser.displayName ?? "User",
      email: fbUser.email ?? "",
      emailVerified: fbUser.emailVerified,
    };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) { setUser(null); return; }
    await fbUser.reload();
    if (!fbUser.emailVerified) {
      setUser(null);
      return;
    }
    const appUser = await buildAppUser(fbUser);
    setUser(appUser);
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        if (!fbUser.emailVerified) {
          setUser(null);
        } else {
          const appUser = await buildAppUser(fbUser);
          setUser(appUser);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsub;
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        await signOut(auth);
        return { ok: false, error: "Please verify your email address before logging in." };
      }
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: friendlyError(err) };
    }
  };

  // ── Signup ─────────────────────────────────────────────────────────────────
  const signup = async (name: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Best-effort: set display name + Firestore profile + verification email.
      // If any of these fail, the account is still created — don't block signup.
      try {
        await fbUpdateProfile(cred.user, { displayName: name });
      } catch (e) { console.warn("[signup] displayName update failed:", e); }

      try {
        await setDoc(doc(db, "users", cred.user.uid), {
          name,
          email,
          role: "user",
          createdAt: serverTimestamp(),
        });
      } catch (e) { console.warn("[signup] Firestore write failed:", e); }

      try {
        await sendEmailVerification(cred.user);
      } catch (e) { console.warn("[signup] Verification email failed:", e); }

      // Sign out — user must verify email before logging in
      await signOut(auth);
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: friendlyError(err) };
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  // ── Update display name ────────────────────────────────────────────────────
  const updateDisplayName = async (name: string) => {
    try {
      const fbUser = auth.currentUser;
      if (!fbUser) return { ok: false, error: "Not authenticated." };
      await fbUpdateProfile(fbUser, { displayName: name });
      // Use merge so it works even if the Firestore doc doesn't exist yet
      await setDoc(doc(db, "users", fbUser.uid), { name }, { merge: true });
      setUser((prev) => (prev ? { ...prev, name } : prev));
      return { ok: true };
    } catch (err: unknown) {
      console.error("[updateDisplayName] error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  };

  // ── Change password (requires re-auth) ────────────────────────────────────
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const fbUser = auth.currentUser;
      if (!fbUser || !fbUser.email) return { ok: false, error: "Not authenticated." };
      const cred = EmailAuthProvider.credential(fbUser.email, currentPassword);
      await reauthenticateWithCredential(fbUser, cred);
      await updatePassword(fbUser, newPassword);
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: friendlyError(err) };
    }
  };

  // ── Change email (requires re-auth, sends verification to new email) ───────
  const changeEmail = async (currentPassword: string, newEmail: string) => {
    try {
      const fbUser = auth.currentUser;
      if (!fbUser || !fbUser.email) return { ok: false, error: "Not authenticated." };
      const cred = EmailAuthProvider.credential(fbUser.email, currentPassword);
      await reauthenticateWithCredential(fbUser, cred);
      // Sends a verification link to newEmail; email only changes after user clicks it
      await verifyBeforeUpdateEmail(fbUser, newEmail);
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: friendlyError(err) };
    }
  };

  /** Legacy shim used in a few pages */
  const updateProfile = (updates: { name?: string; email?: string }) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        email: user?.email ?? null,
        name: user?.name ?? null,
        token: null,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        updateDisplayName,
        changePassword,
        changeEmail,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

// ── Map Firebase error codes to human-readable messages ─────────────────────
function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/user-not-found":        "No account found with that email.",
    "auth/wrong-password":        "Incorrect password.",
    "auth/invalid-credential":    "Invalid email or password.",
    "auth/email-already-in-use":  "An account with this email already exists.",
    "auth/weak-password":         "Password must be at least 6 characters.",
    "auth/invalid-email":         "Invalid email address.",
    "auth/too-many-requests":     "Too many attempts. Please try again later.",
    "auth/requires-recent-login": "Please log out and log back in before making this change.",
    "auth/network-request-failed":"Network error. Check your connection.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}
