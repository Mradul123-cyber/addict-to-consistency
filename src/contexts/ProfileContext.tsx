import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  JEE_TARGET_YEARS,
  type JeeTargetYear,
  type UserProfile,
  targetDateFromYear,
} from "@/lib/profile";

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  targetDate: Date | null;
  saveTargetYear: (year: JeeTargetYear) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

function isValidTargetYear(value: unknown): value is JeeTargetYear {
  return typeof value === "number" && JEE_TARGET_YEARS.includes(value as JeeTargetYear);
}

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const profileRef = doc(db, "users", uid, "profile", "data");
    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (isValidTargetYear(data.targetYear)) {
            setProfile({ targetYear: data.targetYear });
          } else {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to profile:", err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [uid]);

  const targetDate = useMemo(
    () => (profile ? targetDateFromYear(profile.targetYear) : null),
    [profile],
  );

  const saveTargetYear = async (year: JeeTargetYear) => {
    if (!uid) return;
    const profileRef = doc(db, "users", uid, "profile", "data");
    await setDoc(profileRef, { targetYear: year });
  };

  return (
    <ProfileContext.Provider value={{ profile, loading, targetDate, saveTargetYear }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};
