import React, { createContext, useCallback, useContext, useRef, useState } from "react";

interface NotesChromeContextType {
  bookmarkCount: number;
  openBookmarks: () => void;
  setNotesChrome: (chrome: {
    bookmarkCount?: number;
    openBookmarks?: (() => void) | null;
  }) => void;
}

const NotesChromeContext = createContext<NotesChromeContextType | undefined>(undefined);

export const NotesChromeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const openBookmarksRef = useRef<(() => void) | null>(null);

  const setNotesChrome = useCallback(
    (chrome: { bookmarkCount?: number; openBookmarks?: (() => void) | null }) => {
      if (chrome.bookmarkCount !== undefined) setBookmarkCount(chrome.bookmarkCount);
      if (chrome.openBookmarks !== undefined) openBookmarksRef.current = chrome.openBookmarks;
    },
    [],
  );

  const openBookmarks = useCallback(() => {
    openBookmarksRef.current?.();
  }, []);

  return (
    <NotesChromeContext.Provider value={{ bookmarkCount, openBookmarks, setNotesChrome }}>
      {children}
    </NotesChromeContext.Provider>
  );
};

export function useNotesChrome() {
  const ctx = useContext(NotesChromeContext);
  if (!ctx) {
    return {
      bookmarkCount: 0,
      openBookmarks: () => {},
      setNotesChrome: () => {},
    };
  }
  return ctx;
}
