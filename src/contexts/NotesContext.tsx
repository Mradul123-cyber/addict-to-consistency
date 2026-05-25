import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearNotesCache,
  fetchNotesManifest,
  getLastManifestSource,
  getManifestChapterFlags,
  type ChapterNotesFlags,
  type NotesLoadSource,
  type NotesManifest,
} from "@/lib/notes";

interface NotesContextType {
  manifest: NotesManifest;
  loading: boolean;
  manifestSource: NotesLoadSource | null;
  getChapterFlags: (subjectId: string, chapterId: string) => ChapterNotesFlags;
  reloadManifest: () => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [manifest, setManifest] = useState<NotesManifest>({});
  const [loading, setLoading] = useState(true);
  const [manifestSource, setManifestSource] = useState<NotesLoadSource | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reloadManifest = useMemo(
    () => () => {
      clearNotesCache();
      setManifest({});
      setManifestSource(null);
      setReloadToken((t) => t + 1);
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setManifest({});
      setManifestSource(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchNotesManifest().then((data) => {
      if (cancelled) return;
      setManifest(data ?? {});
      setManifestSource(getLastManifestSource());
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, reloadToken]);

  const getChapterFlags = useMemo(
    () => (subjectId: string, chapterId: string) =>
      getManifestChapterFlags(manifest, subjectId, chapterId),
    [manifest],
  );

  const value = useMemo(
    () => ({ manifest, loading, manifestSource, getChapterFlags, reloadManifest }),
    [manifest, loading, manifestSource, getChapterFlags, reloadManifest],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
};

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
