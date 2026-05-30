/**
 * Admin context — loads dynamic admin list from Firestore
 * so UIDs added via UI are recognized without code changes
 */

import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

// Primary admin UID — always valid, can never be removed
const PRIMARY_ADMIN_UID = "1tPxrTKc0ZXFhRb0ZngWjp75zJ32";

interface AdminContextValue {
  isAdmin: boolean;
  isPrimaryAdmin: boolean;
  adminUids: string[];
  geminiApiKey: string | null; // current user's own Gemini key
  loadingAdmin: boolean;
}

const AdminContext = createContext<AdminContextValue>({
  isAdmin: false,
  isPrimaryAdmin: false,
  adminUids: [],
  geminiApiKey: null,
  loadingAdmin: true,
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [adminUids, setAdminUids] = useState<string[]>([PRIMARY_ADMIN_UID]);
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  // Listen to dynamic admin list in Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "adminConfig", "settings"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const dynamic: string[] = data.adminUids ?? [];
          setAdminUids([PRIMARY_ADMIN_UID, ...dynamic.filter((u) => u !== PRIMARY_ADMIN_UID)]);
        }
        setLoadingAdmin(false);
      },
      () => setLoadingAdmin(false)
    );
    return () => unsub();
  }, []);

  // Load current user's own Gemini API key
  useEffect(() => {
    if (!user) { setGeminiApiKey(null); return; }
    getDoc(doc(db, "users", user.uid, "adminSettings", "data")).then((snap) => {
      if (snap.exists()) setGeminiApiKey(snap.data().geminiApiKey ?? null);
    });
  }, [user]);

  const isAdmin = !!user && adminUids.includes(user.uid);
  const isPrimaryAdmin = user?.uid === PRIMARY_ADMIN_UID;

  return (
    <AdminContext.Provider value={{ isAdmin, isPrimaryAdmin, adminUids, geminiApiKey, loadingAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
