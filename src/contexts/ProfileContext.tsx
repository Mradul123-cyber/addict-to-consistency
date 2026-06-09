import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, getDoc, runTransaction, setDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  canChangeDailyGoal,
  DEFAULT_DAILY_GOAL_MINUTES,
  isValidDailyGoalMinutes,
  MAX_DAILY_GOAL_MINUTES,
  MIN_DAILY_GOAL_MINUTES,
  JEE_TARGET_YEARS,
  type JeeTargetYear,
  type AppMode,
  normalizeDailyGoalMinutes,
  type UserProfile,
  targetDateFromYear,
} from "@/lib/profile";

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  targetDate: Date | null;
  saveProfile: (input: { targetYear: JeeTargetYear; dailyGoalMinutes?: number; mode?: AppMode }) => Promise<void>;
  saveTargetYear: (year: JeeTargetYear) => Promise<void>;
  saveDailyGoalMinutes: (minutes: number) => Promise<void>;
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
    let cancelled = false;
    const profileRef = doc(db, "users", uid, "profile", "data");

    getDoc(profileRef).then((snapshot) => {
      if (cancelled) return;
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (isValidTargetYear(data.targetYear)) {
          setProfile({
            targetYear: data.targetYear,
            dailyGoalMinutes: normalizeDailyGoalMinutes(data.dailyGoalMinutes),
            dailyGoalChangedAt:
              typeof data.dailyGoalChangedAt === "number" ? data.dailyGoalChangedAt : null,
            mode: (data.mode === "professional" || data.mode === "jee") ? data.mode : "jee",
          });
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    }).catch((err) => {
      if (cancelled) return;
      console.error("Error fetching profile:", err);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [uid]);

  const targetDate = useMemo(
    () => (profile ? targetDateFromYear(profile.targetYear) : null),
    [profile],
  );

  const saveProfile = async ({
    targetYear,
    dailyGoalMinutes = DEFAULT_DAILY_GOAL_MINUTES,
    mode,
  }: {
    targetYear: JeeTargetYear;
    dailyGoalMinutes?: number;
    mode?: AppMode;
  }) => {
    if (!uid) return;
    if (!isValidDailyGoalMinutes(dailyGoalMinutes)) {
      throw new Error(
        `Daily goal must be between ${MIN_DAILY_GOAL_MINUTES} and ${MAX_DAILY_GOAL_MINUTES} minutes.`,
      );
    }
    const goal = normalizeDailyGoalMinutes(dailyGoalMinutes);
    const profileRef = doc(db, "users", uid, "profile", "data");
    const changedAt = Date.now();
    await setDoc(
      profileRef,
      {
        targetYear,
        dailyGoalMinutes: goal,
        dailyGoalChangedAt: changedAt,
        ...(mode ? { mode } : {}),
      },
      { merge: true },
    );
    setProfile((prev) => ({
      targetYear,
      dailyGoalMinutes: goal,
      dailyGoalChangedAt: changedAt,
      mode: mode ?? prev?.mode ?? "jee",
    }));
  };

  const saveTargetYear = async (year: JeeTargetYear) => {
    if (!uid) return;
    const profileRef = doc(db, "users", uid, "profile", "data");
    await setDoc(profileRef, { targetYear: year }, { merge: true });
    setProfile((prev) => (prev ? { ...prev, targetYear: year } : prev));
  };

  const saveDailyGoalMinutes = async (minutes: number) => {
    if (!uid) return;
    if (!isValidDailyGoalMinutes(minutes)) {
      throw new Error(
        `Daily goal must be between ${MIN_DAILY_GOAL_MINUTES} and ${MAX_DAILY_GOAL_MINUTES} minutes.`,
      );
    }
    const goal = normalizeDailyGoalMinutes(minutes);

    const profileRef = doc(db, "users", uid, "profile", "data");
    const previousProfile = profile;
    const changedAtNow = Date.now();
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            dailyGoalMinutes: goal,
            dailyGoalChangedAt: changedAtNow,
          }
        : prev,
    );

    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(profileRef);
      const current = snapshot.data();
      const currentGoal = normalizeDailyGoalMinutes(current?.dailyGoalMinutes);
      const changedAt =
        typeof current?.dailyGoalChangedAt === "number" ? current.dailyGoalChangedAt : null;

      if (currentGoal === goal) return;
      if (!canChangeDailyGoal(changedAt)) {
        throw new Error("Daily goal can only be changed once every 30 days.");
      }

      transaction.set(
        profileRef,
        {
          dailyGoalMinutes: goal,
          dailyGoalChangedAt: changedAtNow,
        },
        { merge: true },
      );
    }).catch((err) => {
      setProfile(previousProfile);
      throw err;
    });
  };

  return (
    <ProfileContext.Provider
      value={{ profile, loading, targetDate, saveProfile, saveTargetYear, saveDailyGoalMinutes }}
    >
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
