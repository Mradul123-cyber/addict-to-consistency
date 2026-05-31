import { useState, useEffect, useRef } from "react";
import {
  listTeachSessions, renameTeachSession, deleteTeachSession,
  type TeachSession,
} from "@/lib/teach-sessions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Pencil, Trash2, Check, X, Clock, MessageSquare } from "lucide-react";

interface SessionHistoryProps {
  open: boolean;
  onClose: () => void;
  uid: string;
  currentSessionId: string | null;
  onLoadSession: (session: TeachSession) => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function SessionHistory({ open, onClose, uid, currentSessionId, onLoadSession }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<TeachSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TeachSession | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !uid) return;
    setLoading(true);
    listTeachSessions(uid)
      .then(setSessions)
      .catch(() => toast.error("Failed to load sessions"))
      .finally(() => setLoading(false));
  }, [open, uid]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const startRename = (session: TeachSession) => {
    setRenamingId(session.id);
    setRenameValue(session.title);
  };

  const commitRename = async (sessionId: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      await renameTeachSession(uid, sessionId, renameValue);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: renameValue.trim() } : s));
    } catch {
      toast.error("Failed to rename session");
    }
    setRenamingId(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTeachSession(uid, deleteTarget.id);
      setSessions(prev => prev.filter(s => s.id !== deleteTarget.id));
      toast.success("Session deleted");
    } catch {
      toast.error("Failed to delete session");
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <SheetContent side="left" className="w-full sm:max-w-sm flex flex-col gap-0 p-0 z-[70]">
          <SheetHeader className="px-5 pt-5 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Session History
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                <p className="font-medium text-sm">No sessions yet</p>
                <p className="text-xs text-muted-foreground">Your teaching sessions will appear here automatically.</p>
              </div>
            ) : (
              <AnimatePresence>
                <div className="divide-y">
                  {sessions.map((session, i) => {
                    const isCurrent = session.id === currentSessionId;
                    const isRenaming = renamingId === session.id;

                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className={`group flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 ${
                          isCurrent ? "bg-muted/30" : ""
                        }`}
                      >
                        {/* Session info — click to load */}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => { if (!isRenaming) { onLoadSession(session); onClose(); } }}
                        >
                          {isRenaming ? (
                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                              <Input
                                ref={renameInputRef}
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter") commitRename(session.id);
                                  if (e.key === "Escape") setRenamingId(null);
                                }}
                                className="h-7 text-sm py-0 px-2"
                              />
                              <button onClick={() => commitRename(session.id)} className="text-green-600 hover:text-green-500">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setRenamingId(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <p className={`text-sm font-medium leading-snug truncate ${isCurrent ? "text-foreground" : ""}`}>
                              {session.title}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground">{formatDate(session.updatedAt)}</p>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Current</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {!isRenaming && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                            <button
                              onClick={e => { e.stopPropagation(); startRename(session); }}
                              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Rename"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteTarget(session); }}
                              className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">"{deleteTarget?.title}"</span> will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
