import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Atom,
  Beaker,
  BookOpen,
  Bookmark,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Hexagon,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Sigma,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  fetchFormulaSheet,
  fetchShortNotes,
  getContentLoadSource,
  type NotesLoadSource,
} from "@/lib/notes";
import {
  documentToBlocks,
  type Chapter,
  type ContentBlock,
  type Subject,
  SUBJECT_META_ID,
  SUBJECT_SHORT,
} from "@/lib/matrix-types";
import { useNotes } from "@/contexts/NotesContext";
import { useNotesChrome } from "@/contexts/NotesChromeContext";
import { Skeleton } from "@/components/ui/skeleton";
import { FormulaBlock } from "./FormulaBlock";

const subjectMeta: Record<
  string,
  { icon: typeof Atom; gradient: string; ring: string; dot: string; tag: string }
> = {
  physics: {
    icon: Atom,
    gradient: "from-sky-500/15 via-sky-500/5 to-transparent",
    ring: "ring-sky-500/30",
    dot: "bg-sky-500",
    tag: "text-sky-600 dark:text-sky-400",
  },
  phychem: {
    icon: FlaskConical,
    gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
    ring: "ring-violet-500/30",
    dot: "bg-violet-500",
    tag: "text-violet-600 dark:text-violet-400",
  },
  orgchem: {
    icon: Hexagon,
    gradient: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    ring: "ring-emerald-500/30",
    dot: "bg-emerald-500",
    tag: "text-emerald-600 dark:text-emerald-400",
  },
  inorgchem: {
    icon: Beaker,
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    ring: "ring-amber-500/30",
    dot: "bg-amber-500",
    tag: "text-amber-600 dark:text-amber-400",
  },
  math: {
    icon: Sigma,
    gradient: "from-rose-500/15 via-rose-500/5 to-transparent",
    ring: "ring-rose-500/30",
    dot: "bg-rose-500",
    tag: "text-rose-600 dark:text-rose-400",
  },
};

const getMeta = (id: string) => subjectMeta[SUBJECT_META_ID[id] ?? id] ?? subjectMeta.physics;

type Tab = "notes" | "formulas";
type View = "library" | "chapter";

type ChapterContentCache = {
  loaded?: boolean;
  loading?: boolean;
  shortNotes?: ContentBlock[];
  formulaSheet?: ContentBlock[];
  shortNotesSource?: NotesLoadSource | null;
  formulaSheetSource?: NotesLoadSource | null;
};

type SavedBookmark = {
  id: string;
  expr: string;
  label?: string;
  chapterId: string;
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const bookmarkCacheKey = (uid: string) => `matrix-bookmarks:${uid}`;

const getScrollParent = (el: HTMLElement): HTMLElement | null => {
  let parent = el.parentElement;
  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    if (/(auto|scroll)/.test(overflowY) && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
};

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
    {children}
  </kbd>
);

export default function MatrixApp() {
  const { tracks } = useStore();
  const { user } = useAuth();
  const { getChapterFlags } = useNotes();
  const { setNotesChrome } = useNotesChrome();

  const [view, setView] = useState<View>("library");
  const [activeChapterId, setActiveChapterId] = useState("");
  const [tab, setTab] = useState<Tab>("notes");
  const [rightOpen, setRightOpen] = useState(true);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [confirmBookmarkRemove, setConfirmBookmarkRemove] = useState(true);
  const [bookmarkRemoveTarget, setBookmarkRemoveTarget] = useState<SavedBookmark | null>(null);
  const [pendingBookmarkJump, setPendingBookmarkJump] = useState<SavedBookmark | null>(null);
  const [highlightedBookmarkId, setHighlightedBookmarkId] = useState("");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<SavedBookmark[]>([]);
  const [bookmarksHydrated, setBookmarksHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [contentCache, setContentCache] = useState<Record<string, ChapterContentCache>>({});
  const [contentReloadToken, setContentReloadToken] = useState(0);

  const centerRef = useRef<HTMLDivElement>(null);
  const switcherContentRef = useRef<HTMLDivElement>(null);
  const bookmarkHighlightTimerRef = useRef<number | null>(null);
  const loadingChaptersRef = useRef<Set<string>>(new Set());

  const subjects: Subject[] = useMemo(
    () =>
      tracks.map((t) => ({
        id: t.id,
        name: t.name,
        short: SUBJECT_SHORT[t.id] ?? t.name.slice(0, 2).toUpperCase(),
        chapters: t.chapters.map((c) => ({ id: c.id, name: c.name })),
      })),
    [tracks],
  );

  const findChapter = (id: string) => {
    for (const s of subjects) {
      const c = s.chapters.find((ch) => ch.id === id);
      if (c) return { subject: s, chapter: c };
    }
    return null;
  };

  const found = activeChapterId ? findChapter(activeChapterId) : undefined;
  const baseChapter = found?.chapter;
  const subject = found?.subject;
  const cached = activeChapterId ? contentCache[activeChapterId] : undefined;

  const chapter: Chapter | undefined = baseChapter
    ? {
        ...baseChapter,
        shortNotes: cached?.shortNotes,
        formulaSheet: cached?.formulaSheet,
      }
    : undefined;

  const chapterFlags =
    subject && baseChapter ? getChapterFlags(subject.id, baseChapter.id) : null;

  useEffect(() => {
    if (!subject || !baseChapter || view !== "chapter") return;
    const key = baseChapter.id;
    const flags = getChapterFlags(subject.id, baseChapter.id);
    if (!flags.hasNotes && !flags.hasFormulas) return;
    if (contentCache[key]?.loaded || loadingChaptersRef.current.has(key)) return;

    let cancelled = false;
    loadingChaptersRef.current.add(key);
    setContentCache((prev) => ({
      ...prev,
      [key]: { ...prev[key], loading: true },
    }));

    void Promise.all([
      flags.hasNotes ? fetchShortNotes(subject.id, baseChapter.id) : Promise.resolve(null),
      flags.hasFormulas ? fetchFormulaSheet(subject.id, baseChapter.id) : Promise.resolve(null),
    ])
      .then(([notesDoc, formulasDoc]) => {
        if (cancelled) return;
        setContentCache((prev) => ({
          ...prev,
          [key]: {
            loaded: true,
            loading: false,
            shortNotes: documentToBlocks(notesDoc),
            formulaSheet: documentToBlocks(formulasDoc),
            shortNotesSource: flags.hasNotes
              ? getContentLoadSource(subject.id, baseChapter.id, "short-notes")
              : null,
            formulaSheetSource: flags.hasFormulas
              ? getContentLoadSource(subject.id, baseChapter.id, "formula-sheet")
              : null,
          },
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setContentCache((prev) => ({
            ...prev,
            [key]: { loaded: true, loading: false },
          }));
        }
      })
      .finally(() => {
        loadingChaptersRef.current.delete(key);
      });

    return () => {
      cancelled = true;
    };
  }, [subject?.id, baseChapter?.id, view, getChapterFlags, contentReloadToken]);

  useEffect(() => {
    if (!chapterFlags) return;
    if (tab === "notes" && !chapterFlags.hasNotes && chapterFlags.hasFormulas) setTab("formulas");
    if (tab === "formulas" && !chapterFlags.hasFormulas && chapterFlags.hasNotes) setTab("notes");
  }, [chapterFlags, tab]);

  const content: ContentBlock[] | undefined =
    tab === "notes" ? chapter?.shortNotes : chapter?.formulaSheet;

  const contentLoading = Boolean(cached?.loading);

  const sections = useMemo(
    () =>
      (content ?? [])
        .filter((b): b is { type: "heading"; text: string } => b.type === "heading")
        .map((b) => ({ id: slugify(b.text), text: b.text })),
    [content],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "Escape") {
        if (revisionOpen) return setRevisionOpen(false);
        if (bookmarkRemoveTarget) return setBookmarkRemoveTarget(null);
        if (bookmarksOpen) return setBookmarksOpen(false);
        if (switcherOpen) return setSwitcherOpen(false);
        if (view === "chapter") setView("library");
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "n" && chapterFlags?.hasNotes) setTab("notes");
      if (k === "f" && chapterFlags?.hasFormulas) setTab("formulas");
      if (k === "r" && chapter) setRevisionOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chapter, chapterFlags, revisionOpen, bookmarkRemoveTarget, bookmarksOpen, switcherOpen, view]);

  useEffect(() => {
    const root = centerRef.current;
    if (!root || view !== "chapter") return;
    const handler = () => {
      const headings = root.querySelectorAll<HTMLElement>("[data-section]");
      let current = "";
      headings.forEach((h) => {
        const top = h.getBoundingClientRect().top - root.getBoundingClientRect().top;
        if (top < 120) current = h.dataset.section!;
      });
      setActiveSection(current);
    };
    root.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => root.removeEventListener("scroll", handler);
  }, [content, view]);

  const openChapter = (chId: string) => {
    const f = findChapter(chId);
    if (!f) return;
    const flags = getChapterFlags(f.subject.id, f.chapter.id);
    if (!flags.hasNotes && !flags.hasFormulas) return;
    setActiveChapterId(chId);
    setTab(flags.hasNotes ? "notes" : "formulas");
    setView("chapter");
    setSwitcherOpen(false);
    centerRef.current?.scrollTo({ top: 0 });
  };

  const toggleBookmark = (chapterId: string, expr: string, label?: string) => {
    const id = `${chapterId}::${expr}`;
    setBookmarks((b) =>
      b.find((x) => x.id === id)
        ? b.filter((x) => x.id !== id)
        : [...b, { id, expr, label, chapterId }],
    );
  };
  const isBookmarked = (chapterId: string, expr: string) =>
    bookmarks.some((b) => b.id === `${chapterId}::${expr}`);

  const removeBookmark = (id: string) => {
    setBookmarks((b) => b.filter((x) => x.id !== id));
    setBookmarkRemoveTarget((target) => (target?.id === id ? null : target));
  };

  const requestRemoveBookmark = (bookmark: SavedBookmark) => {
    if (confirmBookmarkRemove) {
      setBookmarkRemoveTarget(bookmark);
      return;
    }
    removeBookmark(bookmark.id);
  };

  const jumpToBookmark = (bookmark: SavedBookmark) => {
    const src = findChapter(bookmark.chapterId);
    if (!src) return;

    setActiveChapterId(src.chapter.id);
    setTab("formulas");
    setView("chapter");
    setSwitcherOpen(false);
    setBookmarkRemoveTarget(null);
    setBookmarksOpen(false);
    setPendingBookmarkJump(bookmark);
  };

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const out: { subject: Subject; chapter: Chapter; tab: Tab; snippet: string }[] = [];
    for (const s of subjects) {
      for (const c of s.chapters) {
        const flags = getChapterFlags(s.id, c.id);
        const cachedCh = contentCache[c.id];
        if (c.name.toLowerCase().includes(q)) {
          out.push({
            subject: s,
            chapter: c,
            tab: flags.hasNotes ? "notes" : "formulas",
            snippet: c.name,
          });
        }
        const scan = (blocks: ContentBlock[] | undefined, t: Tab) => {
          blocks?.forEach((b) => {
            const text = "text" in b ? b.text : `${b.label ?? ""} ${b.expr}`;
            if (text.toLowerCase().includes(q)) {
              out.push({ subject: s, chapter: c, tab: t, snippet: text.slice(0, 80) });
            }
          });
        };
        scan(cachedCh?.shortNotes, "notes");
        scan(cachedCh?.formulaSheet, "formulas");
      }
    }
    return out.slice(0, 8);
  }, [search, subjects, contentCache, getChapterFlags]);

  const revisionFormulas = chapter?.formulaSheet ?? cached?.formulaSheet;

  useEffect(() => {
    const uid = user?.uid;
    setBookmarksHydrated(false);

    if (!uid) {
      setBookmarks([]);
      setBookmarksHydrated(true);
      return;
    }

    const cacheKey = bookmarkCacheKey(uid);
    let cachedBookmarks: SavedBookmark[] = [];
    try {
      cachedBookmarks = JSON.parse(localStorage.getItem(cacheKey) ?? "[]");
      if (Array.isArray(cachedBookmarks)) {
        setBookmarks(cachedBookmarks);
      }
    } catch {
      cachedBookmarks = [];
    }

    const bookmarksRef = doc(db, "users", uid, "matrix", "bookmarks");
    return onSnapshot(
      bookmarksRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const items = snapshot.data().items;
          const next = Array.isArray(items) ? (items as SavedBookmark[]) : [];
          setBookmarks(next);
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } else if (cachedBookmarks.length > 0) {
          await setDoc(bookmarksRef, { items: cachedBookmarks, updatedAt: Date.now() });
        }
        setBookmarksHydrated(true);
      },
      (err) => {
        console.error("Error listening to saved formulas:", err);
        setBookmarksHydrated(true);
      },
    );
  }, [user?.uid]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || !bookmarksHydrated) return;

    const cacheKey = bookmarkCacheKey(uid);
    localStorage.setItem(cacheKey, JSON.stringify(bookmarks));

    const saveTimer = window.setTimeout(() => {
      void setDoc(
        doc(db, "users", uid, "matrix", "bookmarks"),
        { items: bookmarks, updatedAt: Date.now() },
        { merge: true },
      ).catch((err) => {
        console.error("Error saving saved formulas:", err);
      });
    }, 400);

    return () => window.clearTimeout(saveTimer);
  }, [bookmarks, bookmarksHydrated, user?.uid]);

  useEffect(() => {
    setNotesChrome({
      bookmarkCount: bookmarks.length,
      openBookmarks: () => setBookmarksOpen(true),
    });
    return () => setNotesChrome({ bookmarkCount: 0, openBookmarks: null });
  }, [bookmarks.length, setNotesChrome]);

  useEffect(() => {
    if (!switcherOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [switcherOpen]);

  const scrollSwitcherToSubject = (subjectId: string) => {
    const root = switcherContentRef.current;
    const target = root?.querySelector<HTMLElement>(`#sw-${subjectId}`);
    if (!root || !target) return;

    root.scrollTo({
      top: target.offsetTop - root.offsetTop,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (!pendingBookmarkJump || view !== "chapter" || tab !== "formulas" || contentLoading) return;
    if (activeChapterId !== pendingBookmarkJump.chapterId) return;

    const timer = window.setTimeout(() => {
      const root = centerRef.current;
      const target = Array.from(
        root?.querySelectorAll<HTMLElement>("[data-bookmark-id]") ?? [],
      ).find((el) => el.dataset.bookmarkId === pendingBookmarkJump.id);
      if (!target) return;

      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      window.setTimeout(() => {
        setHighlightedBookmarkId(pendingBookmarkJump.id);
      }, 180);
      setPendingBookmarkJump(null);
      if (bookmarkHighlightTimerRef.current) window.clearTimeout(bookmarkHighlightTimerRef.current);
      bookmarkHighlightTimerRef.current = window.setTimeout(() => {
        setHighlightedBookmarkId("");
        bookmarkHighlightTimerRef.current = null;
      }, 2100);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [pendingBookmarkJump, view, tab, activeChapterId, contentLoading, content]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      {view === "chapter" && chapter && subject && (
        <header className="relative z-30 flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2.5 md:gap-3 md:px-6">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setView("library")}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Library</span>
            </button>
            <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              <ChevronRight className="hidden h-3 w-3 sm:block" />
              <button
                type="button"
                onClick={() => setSwitcherOpen((o) => !o)}
                className="flex max-w-[min(100%,14rem)] items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-foreground hover:bg-muted sm:max-w-xs"
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", getMeta(subject.id).dot)} />
                <span className="shrink-0">{subject.short}</span>
                <span className="text-muted-foreground/70">/</span>
                <span className="truncate">{chapter.name}</span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
              </button>
            </div>
          </div>

          <NotesSearchBar
            className="min-w-0 flex-1 md:max-w-md"
            search={search}
            onSearchChange={setSearch}
            searchFocus={searchFocus}
            onSearchFocus={setSearchFocus}
            results={results}
            onSelectResult={(r) => {
              openChapter(r.chapter.id);
              setTab(r.tab);
              setSearch("");
            }}
          />

          <button
            type="button"
            onClick={() => setRevisionOpen(true)}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 sm:px-3"
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Revision</span>
            <Kbd>R</Kbd>
          </button>

          {switcherOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setSwitcherOpen(false)} />
            <div
              className="animate-fade-in absolute top-full left-0 z-40 mt-2 flex w-[min(640px,calc(100vw-2rem))] max-h-[min(70vh,32rem)] flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-2xl sm:max-h-[70vh] md:left-4"
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="flex min-h-0 flex-1 overflow-hidden">
                <nav
                  aria-label="Subjects"
                  className="scrollbar-thin hidden w-[200px] shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-border bg-muted/40 p-2 sm:flex"
                >
                  {subjects.map((s) => {
                    const M = getMeta(s.id);
                    const Icon = M.icon;
                    const active = s.id === subject?.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => scrollSwitcherToSubject(s.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          active
                            ? "bg-background text-foreground"
                            : "text-muted-foreground hover:bg-background/60",
                        )}
                      >
                        <Icon className={cn("h-4 w-4", M.tag)} />
                        <span className="truncate">{s.name}</span>
                      </button>
                    );
                  })}
                </nav>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="scrollbar-thin flex shrink-0 gap-1 overflow-x-auto overscroll-contain border-b border-border bg-muted/40 p-2 sm:hidden">
                    {subjects.map((s) => {
                      const M = getMeta(s.id);
                      const Icon = M.icon;
                      const active = s.id === subject?.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => scrollSwitcherToSubject(s.id)}
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-background/60",
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5", M.tag)} />
                          {s.short}
                        </button>
                      );
                    })}
                  </div>
                  <div
                    ref={switcherContentRef}
                    className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
                  >
                  {subjects.map((s) => {
                    const M = getMeta(s.id);
                    return (
                      <div key={s.id} id={`sw-${s.id}`} className="mb-4 last:mb-0">
                        <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                          <span className={cn("h-1.5 w-1.5 rounded-full", M.dot)} />
                          {s.name}
                        </div>
                        <div className="grid gap-1 sm:grid-cols-2">
                          {s.chapters.map((c) => {
                            const flags = getChapterFlags(s.id, c.id);
                            const has = flags.hasNotes || flags.hasFormulas;
                            const active = c.id === chapter?.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => openChapter(c.id)}
                                className={cn(
                                  "flex items-center justify-between gap-2 rounded-md border border-transparent px-2.5 py-1.5 text-left text-[13px] transition-colors",
                                  active
                                    ? "border-accent/40 bg-accent/10 text-foreground"
                                    : "text-muted-foreground hover:border-border hover:bg-muted",
                                  !has && "opacity-50",
                                )}
                              >
                                <span className="truncate">{c.name}</span>
                                <span className="flex shrink-0 gap-1">
                                  {flags.hasNotes && (
                                    <span className="rounded bg-accent/80 px-1 text-[9px] font-semibold text-accent-foreground">
                                      N
                                    </span>
                                  )}
                                  {flags.hasFormulas && (
                                    <span className="rounded border border-accent/60 px-1 text-[9px] font-semibold text-accent">
                                      F
                                    </span>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            </div>
          </>
          )}
        </header>
      )}

      <div className="flex min-h-0 flex-1">
        <main ref={centerRef} className="scrollbar-thin min-w-0 flex-1 overflow-y-auto">
          {view === "library" ? (
            <LibraryView
              subjects={subjects}
              getChapterFlags={getChapterFlags}
              onOpen={openChapter}
              search={search}
              onSearchChange={setSearch}
              searchFocus={searchFocus}
              onSearchFocus={setSearchFocus}
              results={results}
              onSelectResult={(r) => {
                openChapter(r.chapter.id);
                setTab(r.tab);
                setSearch("");
              }}
            />
          ) : chapter ? (
            <div
              key={chapter.id + tab}
              className="animate-fade-in mx-auto max-w-3xl px-5 py-8 md:px-10"
            >
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium",
                  subject && getMeta(subject.id).tag,
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", subject && getMeta(subject.id).dot)}
                />
                {subject?.name}
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{chapter.name}</h1>

              {chapterFlags && (chapterFlags.hasNotes || chapterFlags.hasFormulas) && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {chapterFlags.hasNotes && (
                    <button
                      type="button"
                      onClick={() => setTab("notes")}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                        tab === "notes"
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-card hover:border-accent/60",
                      )}
                    >
                      Short Notes <Kbd>N</Kbd>
                    </button>
                  )}
                  {chapterFlags.hasFormulas && (
                    <button
                      type="button"
                      onClick={() => setTab("formulas")}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                        tab === "formulas"
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-card hover:border-accent/60",
                      )}
                    >
                      Formula Sheet <Kbd>F</Kbd>
                    </button>
                  )}
                </div>
              )}

              <div className="mt-8 pb-24">
                {contentLoading ? (
                  <ContentSkeleton />
                ) : !content ? (
                  <EmptyState />
                ) : (
                  content.map((b, i) => {
                    if (b.type === "heading") {
                      const id = slugify(b.text);
                      return (
                        <h2
                          key={i}
                          id={id}
                          data-section={id}
                          className="mt-8 scroll-mt-6 text-xl font-semibold tracking-tight first:mt-0"
                        >
                          {b.text}
                        </h2>
                      );
                    }
                    if (b.type === "paragraph") {
                      return (
                        <p
                          key={i}
                          className="mt-3 text-[15px] leading-relaxed text-muted-foreground"
                        >
                          {b.text}
                        </p>
                      );
                    }
                    const bookmarkId = `${chapter.id}::${b.expr}`;
                    return (
                      <div key={i} data-bookmark-id={bookmarkId}>
                        <FormulaBlock
                          label={b.label}
                          expr={b.expr}
                          bookmarked={isBookmarked(chapter.id, b.expr)}
                          highlighted={highlightedBookmarkId === bookmarkId}
                          onToggleBookmark={() => toggleBookmark(chapter.id, b.expr, b.label)}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </main>

        {view === "chapter" && (
          <aside
            className={cn(
              "sticky top-0 hidden h-full shrink-0 self-start border-l border-border bg-card transition-all duration-200 lg:block",
              rightOpen ? "w-[280px]" : "w-12",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-3">
              {rightOpen && (
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  In this chapter
                </span>
              )}
              <button
                type="button"
                onClick={() => setRightOpen((o) => !o)}
                className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Toggle panel"
              >
                {rightOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </button>
            </div>
            {rightOpen && (
              <div className="p-3">
                {sections.length === 0 ? (
                  <p className="px-2 text-xs text-muted-foreground">No sections.</p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {sections.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById(s.id);
                            if (!el) return;
                            const root = getScrollParent(el);
                            if (root) {
                              const rootTop = root.getBoundingClientRect().top;
                              const targetTop = el.getBoundingClientRect().top;
                              root.scrollTo({
                                top: root.scrollTop + targetTop - rootTop - 24,
                                behavior: "smooth",
                              });
                            } else {
                              el.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                            setActiveSection(s.id);
                          }}
                          className={cn(
                            "relative flex min-h-8 w-full items-center rounded-md py-1.5 pr-2.5 pl-4 text-left text-[13px] transition-colors",
                            activeSection === s.id
                              ? "bg-orange-500/10 font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-1.5 bottom-1.5 left-0 w-1 rounded-r-full transition-colors",
                              activeSection === s.id ? "bg-orange-500" : "bg-transparent",
                            )}
                          />
                          <span className="truncate">{s.text}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-6 rounded-md border border-dashed border-border p-3">
                  <div className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Shortcuts
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Notes</span>
                      <Kbd>N</Kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Formulas</span>
                      <Kbd>F</Kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Revision</span>
                      <Kbd>R</Kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Library</span>
                      <Kbd>Esc</Kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {revisionOpen && chapter && (
        <div className="scrollbar-thin animate-fade-in fixed inset-0 z-50 overflow-y-auto bg-background">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-accent uppercase">
                Quick Revision
              </div>
              <div className="text-sm font-semibold">{chapter.name}</div>
            </div>
            <button
              type="button"
              onClick={() => setRevisionOpen(false)}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Close <Kbd>Esc</Kbd>
            </button>
          </div>
          <div className="mx-auto max-w-6xl p-5 md:p-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(revisionFormulas ?? [])
                .filter((b) => b.type === "formula")
                .map((b, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/50"
                  >
                    {b.type === "formula" && b.label && (
                      <div className="mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {b.label}
                      </div>
                    )}
                    {b.type === "formula" && (
                      <code className="text-formula-foreground block font-mono text-base">
                        {b.expr}
                      </code>
                    )}
                  </div>
                ))}
            </div>
            {!revisionFormulas?.some((b) => b.type === "formula") && (
              <p className="py-20 text-center text-muted-foreground">No formulas in this chapter.</p>
            )}
          </div>
        </div>
      )}

      {bookmarksOpen && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-accent" />
                <span className="font-semibold">Saved Formulas</span>
                <span className="text-xs text-muted-foreground">{bookmarks.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={confirmBookmarkRemove}
                  onClick={() => setConfirmBookmarkRemove((on) => !on)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Toggle remove confirmation"
                >
                  <span>Ask first</span>
                  <span
                    className={cn(
                      "flex h-4 w-7 items-center rounded-full p-0.5 transition-colors",
                      confirmBookmarkRemove ? "bg-accent" : "bg-muted-foreground/30",
                    )}
                  >
                    <span
                      className={cn(
                        "h-3 w-3 rounded-full bg-background transition-transform",
                        confirmBookmarkRemove && "translate-x-3",
                      )}
                    />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBookmarkRemoveTarget(null);
                    setBookmarksOpen(false);
                  }}
                  className="rounded-md p-1.5 hover:bg-muted"
                  aria-label="Close saved formulas"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="scrollbar-thin max-h-[60vh] overflow-y-auto p-4">
              {bookmarks.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Bookmark formulas to revisit them quickly.
                </p>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((b) => {
                    const src = findChapter(b.chapterId);
                    return (
                      <div
                        key={b.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => jumpToBookmark(b)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            jumpToBookmark(b);
                          }
                        }}
                        className="cursor-pointer rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-accent/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                              {b.label ?? "Formula"}
                            </span>
                            <span className="mt-1 block max-w-full truncate text-[11px] font-medium text-accent">
                              {src ? `${src.subject.short} · ${src.chapter.name}` : "—"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestRemoveBookmark(b);
                            }}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Remove ${b.label ?? "formula"} bookmark`}
                            title="Remove bookmark"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <code className="block font-mono text-sm">{b.expr}</code>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {bookmarkRemoveTarget && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl">
                <div className="text-sm font-semibold">Remove saved formula?</div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  This removes it from your saved formulas list.
                </p>
                <code className="mt-3 block max-h-24 overflow-auto rounded-md bg-muted p-2 font-mono text-xs">
                  {bookmarkRemoveTarget.expr}
                </code>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setBookmarkRemoveTarget(null)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBookmark(bookmarkRemoveTarget.id)}
                    className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type SearchResult = {
  subject: Subject;
  chapter: Chapter;
  tab: Tab;
  snippet: string;
};

function NotesSearchBar({
  search,
  onSearchChange,
  searchFocus,
  onSearchFocus,
  results,
  onSelectResult,
  className,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchFocus: boolean;
  onSearchFocus: (focused: boolean) => void;
  results: SearchResult[];
  onSelectResult: (result: SearchResult) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={() => onSearchFocus(true)}
        onBlur={() => setTimeout(() => onSearchFocus(false), 150)}
        placeholder="Search formulas, notes, chapters…"
        className="h-10 w-full rounded-md border border-border bg-muted/40 pl-9 pr-4 text-sm outline-none transition-colors focus:border-accent focus:bg-background"
      />
      {searchFocus && results.length > 0 && (
        <div className="scrollbar-thin absolute top-full right-0 left-0 z-40 mt-2 max-h-96 animate-fade-in overflow-auto rounded-lg border border-border bg-popover shadow-xl">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => onSelectResult(r)}
              className="flex w-full items-start justify-between gap-3 border-b border-border px-3 py-2.5 text-left text-sm last:border-0 hover:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.chapter.name}</div>
                <div className="truncate text-xs text-muted-foreground">{r.snippet}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  {r.subject.short}
                </span>
                <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  {r.tab === "notes" ? "Notes" : "Formula"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryView({
  subjects,
  getChapterFlags,
  onOpen,
  search,
  onSearchChange,
  searchFocus,
  onSearchFocus,
  results,
  onSelectResult,
}: {
  subjects: Subject[];
  getChapterFlags: (
    subjectId: string,
    chapterId: string,
  ) => { hasNotes: boolean; hasFormulas: boolean };
  onOpen: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchFocus: boolean;
  onSearchFocus: (focused: boolean) => void;
  results: SearchResult[];
  onSelectResult: (result: SearchResult) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="animate-fade-in mx-auto max-w-6xl px-5 py-10 md:px-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-accent" />
            JEE Vault
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Your library, organised.
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
            Pick a subject, jump to a chapter. Short notes and a formula sheet for every topic —
            built for last-mile revision.
          </p>
        </div>
        <NotesSearchBar
          className="w-full shrink-0 md:w-72 lg:w-80"
          search={search}
          onSearchChange={onSearchChange}
          searchFocus={searchFocus}
          onSearchFocus={onSearchFocus}
          results={results}
          onSelectResult={onSelectResult}
        />
      </div>

      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => {
          const M = getMeta(s.id);
          const Icon = M.icon;
          const ready = s.chapters.filter((c) => {
            const f = getChapterFlags(s.id, c.id);
            return f.hasNotes || f.hasFormulas;
          }).length;
          const isOpen = expanded === s.id;
          return (
            <div
              key={s.id}
              className={cn(
                "group/subject relative flex w-full flex-col self-start overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200",
                isOpen
                  ? cn("shadow-sm ring-1", M.ring)
                  : "hover:border-foreground/30 hover:shadow-md",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 transition-opacity duration-200 group-hover/subject:opacity-100",
                  M.gradient,
                )}
              />
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : s.id)}
                className={cn(
                  "relative flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors",
                  "hover:bg-background/55 active:bg-background/65",
                  isOpen ? "rounded-t-2xl" : "rounded-2xl",
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl bg-background/70 ring-1 backdrop-blur transition-transform duration-200 group-hover/subject:scale-105",
                    M.ring,
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-colors", M.tag)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold tracking-tight transition-colors group-hover/subject:text-foreground">
                      {s.name}
                    </h3>
                    <span className="rounded-md bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {s.short}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {s.chapters.length} chapters · {ready} ready
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180",
                    !isOpen && "group-hover/subject:text-foreground",
                  )}
                />
              </button>

              {isOpen && (
                <div className="animate-fade-in relative border-t border-border/60 bg-background/40 p-3 backdrop-blur">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {s.chapters.map((c) => {
                      const flags = getChapterFlags(s.id, c.id);
                      const has = flags.hasNotes || flags.hasFormulas;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => has && onOpen(c.id)}
                          disabled={!has}
                          className={cn(
                            "group/ch flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-all duration-200",
                            has
                              ? "cursor-pointer hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-background hover:shadow-sm"
                              : "cursor-not-allowed opacity-50",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <BookOpen
                                className={cn(
                                  "h-3.5 w-3.5",
                                  has ? M.tag : "text-muted-foreground",
                                )}
                              />
                              <span className="truncate text-[13px] font-medium">{c.name}</span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 pl-5 text-[10px] text-muted-foreground">
                              {flags.hasNotes && (
                                <span className="rounded bg-accent/80 px-1 font-semibold text-accent-foreground">
                                  Notes
                                </span>
                              )}
                              {flags.hasFormulas && (
                                <span className="rounded border border-accent/60 px-1 font-semibold text-accent">
                                  Formulas
                                </span>
                              )}
                              {!has && <span>Coming soon</span>}
                            </div>
                          </div>
                          {has && (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover/ch:translate-x-0.5 group-hover/ch:text-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Kbd>N</Kbd> Notes
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>F</Kbd> Formulas
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>R</Kbd> Revision
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd> Back to library
        </span>
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40">
        <Sigma className="h-10 w-10 text-muted-foreground/60" />
        <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-accent/20" />
        <div className="absolute -bottom-2 -left-2 h-3 w-3 rounded-full bg-accent/40" />
      </div>
      <h3 className="text-lg font-semibold">No content yet</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Notes and formula sheets for this chapter will appear here once added.
      </p>
    </div>
  );
}
