import { useState, useEffect, useMemo } from "react";
import {
  collection, query, where, onSnapshot, doc,
  updateDoc, arrayUnion, arrayRemove, increment,
  addDoc, serverTimestamp, getDocs, deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { SEED_TRACKS } from "@/lib/seed";
import type { Subject } from "@/types/questions";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Upload, ArrowBigUp, FileText, ExternalLink, Plus,
  Filter, Loader2, AlertCircle, Users, Clock, X, ShieldCheck, Trash2,
} from "lucide-react";

interface CommunityNote {
  id: string;
  title: string;
  subject: Subject;
  chapterId: string;
  uploadedBy: string;
  uploaderName: string;
  fileUrls: string[];
  fileNames: string[];
  fileHashes: string[];
  upvotes: number;
  upvotedBy: string[];
  status: "unverified" | "verified";
  createdAt: number;
}

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

const SUBJECTS: { value: Subject; label: string }[] = [
  { value: "physics", label: "Physics" },
  { value: "chemistry", label: "Chemistry" },
  { value: "maths", label: "Mathematics" },
];

const CHAPTER_GROUPS = [
  { label: "Physics", subject: "physics" as Subject, chapters: SEED_TRACKS.find(t => t.id === "physics")?.chapters ?? [] },
  { label: "Physical Chemistry", subject: "chemistry" as Subject, chapters: SEED_TRACKS.find(t => t.id === "pchem")?.chapters ?? [] },
  { label: "Organic Chemistry", subject: "chemistry" as Subject, chapters: SEED_TRACKS.find(t => t.id === "ochem")?.chapters ?? [] },
  { label: "Inorganic Chemistry", subject: "chemistry" as Subject, chapters: SEED_TRACKS.find(t => t.id === "ichem")?.chapters ?? [] },
  { label: "Mathematics", subject: "maths" as Subject, chapters: SEED_TRACKS.find(t => t.id === "maths")?.chapters ?? [] },
];

const ALL_CHAPTERS = CHAPTER_GROUPS.flatMap(g => g.chapters.map(ch => ({ ...ch, subject: g.subject, groupLabel: g.label })));

const APPROVAL_THRESHOLD = 10;

function chapterName(id: string) {
  return ALL_CHAPTERS.find(c => c.id === id)?.name ?? id;
}

export function CommunityNotesBrowser() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<CommunityNote[]>([]);
  const [openFilesNote, setOpenFilesNote] = useState<CommunityNote | null>(null);
  const [deleteNote, setDeleteNote] = useState<CommunityNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "verified" | "unverified">("all");
  const [filterSubject, setFilterSubject] = useState<Subject | "all">("all");
  const [filterChapter, setFilterChapter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "communityNotes"));
    const unsub = onSnapshot(q, snap => {
      const data: CommunityNote[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as CommunityNote));
      setNotes(data);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const counts = useMemo(() => ({
    all: notes.length,
    verified: notes.filter(n => n.status === "verified").length,
    unverified: notes.filter(n => n.status === "unverified").length,
  }), [notes]);

  const visibleNotes = useMemo(() => {
    return notes.filter(n => {
      if (tab === "verified" && n.status !== "verified") return false;
      if (tab === "unverified" && n.status !== "unverified") return false;
      if (filterSubject !== "all" && n.subject !== filterSubject) return false;
      if (filterChapter !== "all" && n.chapterId !== filterChapter) return false;
      return true;
    }).sort((a, b) => b.upvotes - a.upvotes);
  }, [notes, tab, filterSubject, filterChapter]);

  const chapterOptions = useMemo(() => {
    if (filterSubject === "all") return CHAPTER_GROUPS;
    return CHAPTER_GROUPS.filter(g => g.subject === filterSubject);
  }, [filterSubject]);

  const handleDelete = async () => {
    if (!deleteNote) return;
    try {
      await deleteDoc(doc(db, "communityNotes", deleteNote.id));
      toast.success("Note removed.");
      setDeleteNote(null);
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const handleUpvote = async (note: CommunityNote) => {
    if (!user) return;
    if (note.uploadedBy === user.uid) { toast.error("Can't upvote your own note"); return; }
    const hasVoted = note.upvotedBy?.includes(user.uid);
    const noteRef = doc(db, "communityNotes", note.id);
    setVotingId(note.id);
    try {
      const newUpvotes = (note.upvotes ?? 0) + (hasVoted ? -1 : 1);
      await updateDoc(noteRef, {
        upvotes: increment(hasVoted ? -1 : 1),
        upvotedBy: hasVoted ? arrayRemove(user.uid) : arrayUnion(user.uid),
        status: newUpvotes >= APPROVAL_THRESHOLD ? "verified" : "unverified",
      });
    } catch {
      toast.error("Failed to vote");
    } finally {
      setVotingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Community Notes</h2>
          <p className="text-sm text-muted-foreground">
            Student-uploaded notes · {APPROVAL_THRESHOLD} upvotes to publish
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Upload Notes
        </Button>
      </div>

      {/* Sub-tabs */}
      <div className="flex rounded-lg border p-1 gap-1 w-fit">
        {([
          { key: "all", label: "All Notes", count: counts.all },
          { key: "verified", label: "Verified", count: counts.verified },
          { key: "unverified", label: "Needs Review", count: counts.unverified },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                tab === t.key ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
        </div>
        <Select value={filterSubject} onValueChange={v => { setFilterSubject(v as any); setFilterChapter("all"); }}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {SUBJECTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterChapter} onValueChange={setFilterChapter}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue placeholder="All chapters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All chapters</SelectItem>
            {chapterOptions.map(g => (
              <SelectGroup key={g.label}>
                {chapterOptions.length > 1 && <SelectLabel>{g.label}</SelectLabel>}
                {g.chapters.map(ch => <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>)}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleNotes.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5 space-y-2">
            <p className="font-semibold text-sm">
              {tab === "verified" ? "No verified notes yet" : tab === "unverified" ? "No notes need review" : "No notes yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {tab === "verified"
                ? "Notes earn the Verified badge after 10 upvotes."
                : tab === "unverified"
                ? "All uploaded notes have been verified."
                : "Be the first to upload notes for this chapter."}
            </p>
            {tab !== "verified" && tab !== "unverified" && (
              <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)} className="gap-2 mt-1">
                <Plus className="h-4 w-4" /> Upload Notes
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {visibleNotes.map((note, i) => {
              const hasVoted = note.upvotedBy?.includes(user?.uid ?? "");
              const isOwn = note.uploadedBy === user?.uid;
              const isVerified = note.status === "verified";
              const progress = Math.min(((note.upvotes ?? 0) / APPROVAL_THRESHOLD) * 100, 100);

              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                >
                  <Card
                    className={`h-full transition-colors ${(note.fileUrls?.length ?? 0) > 1 ? "cursor-pointer hover:border-foreground/30" : ""}`}
                    onClick={() => { if ((note.fileUrls?.length ?? 0) > 1) setOpenFilesNote(note); }}
                  >
                    <CardContent className="pt-4 pb-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-semibold text-sm leading-snug truncate">{note.title}</p>
                            {isOwn && !isVerified && (
                              <button
                                onClick={e => { e.stopPropagation(); setDeleteNote(note); }}
                                className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
                                title="Remove note"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {chapterName(note.chapterId)} · <span className="capitalize">{note.subject}</span>
                          </p>
                        </div>

                        {isVerified ? (
                          <Badge className="shrink-0 text-xs gap-1 bg-blue-600 hover:bg-blue-600 text-white">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
                            Unverified
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        By {isOwn ? "you" : note.uploaderName}
                      </p>

                      {/* Progress toward verification */}
                      {!isVerified && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{note.upvotes ?? 0}/{APPROVAL_THRESHOLD} upvotes to verify</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant={hasVoted ? "default" : "outline"}
                          className="h-7 gap-1.5 text-xs"
                          disabled={isOwn || votingId === note.id}
                          onClick={e => { e.stopPropagation(); handleUpvote(note); }}
                        >
                          {votingId === note.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ArrowBigUp className="h-3.5 w-3.5" />
                          )}
                          {note.upvotes ?? 0}
                        </Button>
                        {/* Single file — direct view button */}
                        {(note.fileUrls?.length ?? 1) <= 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1.5 text-xs ml-auto"
                            onClick={e => { e.stopPropagation(); window.open((note.fileUrls?.[0]), "_blank"); }}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Button>
                        )}

                        {/* Multiple files — full screen overlay */}
                        {(note.fileUrls?.length ?? 0) > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1.5 text-xs ml-auto"
                            onClick={e => { e.stopPropagation(); setOpenFilesNote(note); }}
                          >
                            <FileText className="h-3 w-3" />
                            {note.fileUrls.length} documents
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Full-screen document picker overlay */}
      <AnimatePresence>
        {openFilesNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={() => setOpenFilesNote(null)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />

            {/* Floating file list — no box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={e => e.stopPropagation()}
              className="relative z-10 w-full max-w-sm text-center"
            >
              <p className="mb-5 text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                {openFilesNote.title}
              </p>

              <div className="flex flex-col items-center space-y-1">
                {openFilesNote.fileUrls.map((url, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.25, ease: "easeOut" }}
                    onClick={() => window.open(url, "_blank")}
                    className="group relative py-2.5 text-xl font-bold leading-snug transition-opacity hover:opacity-60 text-center block"
                  >
                    {openFilesNote.fileNames?.[i] ?? `Document ${i + 1}`}
                    <ExternalLink className="absolute -right-6 top-1/2 -translate-y-1/2 h-4 w-4 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteNote} onOpenChange={open => { if (!open) setDeleteNote(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this note?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">"{deleteNote?.title}"</span> will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload sheet */}
      <UploadSheet open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

function UploadSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<Subject>("physics");
  const [chapterId, setChapterId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadingIndex, setUploadingIndex] = useState(0);

  const chapterOptions = useMemo(() =>
    CHAPTER_GROUPS.filter(g => g.subject === subject),
    [subject]
  );

  const reset = () => {
    setTitle(""); setSubject("physics"); setChapterId(""); setFiles([]); setProgress(0); setUploadingIndex(0);
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const newFiles: File[] = [];
    const alreadyAdded: string[] = [];

    Array.from(incoming).forEach(f => {
      const isDuplicate = files.some(
        existing => existing.name === f.name && existing.size === f.size && existing.lastModified === f.lastModified
      );
      if (isDuplicate) {
        alreadyAdded.push(f.name);
      } else {
        newFiles.push(f);
      }
    });

    if (alreadyAdded.length > 0) {
      toast.warning(
        alreadyAdded.length === 1
          ? `"${alreadyAdded[0]}" is already in your selection`
          : `${alreadyAdded.length} of those files are already added`,
        { duration: 4000 }
      );
    }

    if (newFiles.length > 0) setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const uploadFile = (file: File, index: number, total: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const storageRef = ref(storage, `community-notes/${user!.uid}/${Date.now()}_${file.name}`);
      const task = uploadBytesResumable(storageRef, file);
      task.on("state_changed",
        snap => {
          const fileProgress = snap.bytesTransferred / snap.totalBytes;
          setProgress(Math.round(((index + fileProgress) / total) * 100));
        },
        reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      );
    });

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Add a title"); return; }
    if (!chapterId) { toast.error("Select a chapter"); return; }
    if (files.length === 0) { toast.error("Select at least one file"); return; }
    if (!user) return;

    setUploading(true);
    try {
      // Compute hashes and check for duplicates before uploading
      const hashes = await Promise.all(files.map(hashFile));

      const dupSnap = await getDocs(
        query(collection(db, "communityNotes"), where("fileHashes", "array-contains-any", hashes))
      );
      if (!dupSnap.empty) {
        const dup = dupSnap.docs[0].data();
        // Find which file triggered the match
        const dupHashSet = new Set(dup.fileHashes as string[]);
        const flaggedFile = files.find((_, i) => dupHashSet.has(hashes[i]));
        toast.error("This document is already in the library", {
          description: `"${flaggedFile?.name ?? "Your file"}" has already been uploaded as "${dup.title}" under ${chapterName(dup.chapterId)}. No need to upload again.`,
          duration: 6000,
        });
        setUploading(false);
        return;
      }

      const fileUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadingIndex(i + 1);
        const url = await uploadFile(files[i], i, files.length);
        fileUrls.push(url);
      }

      await addDoc(collection(db, "communityNotes"), {
        title: title.trim(),
        subject,
        chapterId,
        uploadedBy: user.uid,
        uploaderName: user.displayName ?? user.email ?? "Student",
        fileUrls,
        fileNames: files.map(f => f.name),
        fileHashes: hashes,
        upvotes: 0,
        upvotedBy: [],
        status: "unverified",
        createdAt: serverTimestamp(),
      });

      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded. Notes are now publicly visible.`);
      reset();
      onClose();
    } catch {
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { onClose(); reset(); } }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>Upload Notes</SheetTitle>
          <SheetDescription>
            Share your chapter notes with the community. Needs {APPROVAL_THRESHOLD} upvotes to go live.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-2">
            <Label>Title / Concept / Topic</Label>
            <Input
              placeholder="e.g. Electrostatics Key Formulas and Concepts"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <div className="grid grid-cols-3 gap-2">
              {SUBJECTS.map(s => (
                <button
                  key={s.value}
                  onClick={() => { setSubject(s.value); setChapterId(""); }}
                  disabled={uploading}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                    subject === s.value
                      ? "bg-foreground text-background border-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chapter</Label>
            <Select value={chapterId || "__none__"} onValueChange={v => setChapterId(v === "__none__" ? "" : v)} disabled={uploading}>
              <SelectTrigger>
                <SelectValue placeholder="Select chapter" />
              </SelectTrigger>
              <SelectContent>
                {chapterOptions.map(g => (
                  <SelectGroup key={g.label}>
                    {chapterOptions.length > 1 && <SelectLabel>{g.label}</SelectLabel>}
                    {g.chapters.map(ch => (
                      <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Files (PDF or image)</Label>
            <label className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-foreground/30 hover:bg-muted/30"}`}>
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {files.length === 0 ? "Choose PDF or image files" : "Add more files"}
              </span>
              <input
                type="file"
                accept=".pdf,image/*"
                multiple
                className="sr-only"
                disabled={uploading}
                onChange={e => addFiles(e.target.files)}
              />
            </label>

            {files.length > 0 && (
              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(f.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      disabled={uploading}
                      className="ml-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pl-1">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </p>
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading file {uploadingIndex} of {files.length}…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/8 p-3 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Your notes will be publicly visible immediately. Get {APPROVAL_THRESHOLD} upvotes to earn the Verified badge.
          </div>
        </div>

        <div className="px-6 py-4 border-t">
          <Button onClick={handleSubmit} disabled={uploading || files.length === 0 || !title || !chapterId} className="w-full gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload Notes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
