/**
 * Admin Settings Component
 * - Authorize / revoke admin UIDs (primary admin only)
 * - Save personal Gemini API key (each admin saves their own)
 */

import { useState } from "react";
import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ShieldCheck, ShieldX, Key, Eye, EyeOff, UserPlus } from "lucide-react";

const PRIMARY_ADMIN_UID = "1tPxrTKc0ZXFhRb0ZngWjp75zJ32";

export function AdminSettings() {
  const { user } = useAuth();
  const { isPrimaryAdmin, adminUids, geminiApiKey } = useAdmin();

  // Admin UID management
  const [newUid, setNewUid] = useState("");
  const [addingUid, setAddingUid] = useState(false);

  // Gemini key management
  const [keyInput, setKeyInput] = useState(geminiApiKey ?? "");
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  const handleAddAdmin = async () => {
    if (!newUid.trim()) { toast.error("Enter a UID"); return; }
    if (newUid.trim() === PRIMARY_ADMIN_UID) { toast.error("That UID is already the primary admin"); return; }
    setAddingUid(true);
    try {
      const ref = doc(db, "adminConfig", "settings");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, { adminUids: arrayUnion(newUid.trim()) });
      } else {
        await setDoc(ref, { adminUids: [newUid.trim()] });
      }
      toast.success("Admin added");
      setNewUid("");
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setAddingUid(false);
    }
  };

  const handleRemoveAdmin = async (uid: string) => {
    if (uid === PRIMARY_ADMIN_UID) { toast.error("Cannot remove primary admin"); return; }
    try {
      await updateDoc(doc(db, "adminConfig", "settings"), { adminUids: arrayRemove(uid) });
      toast.success("Admin removed");
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!user) return;
    if (!keyInput.trim()) { toast.error("Enter your Gemini API key"); return; }
    setSavingKey(true);
    try {
      await setDoc(
        doc(db, "users", user.uid, "adminSettings", "data"),
        { geminiApiKey: keyInput.trim() },
        { merge: true }
      );
      toast.success("Gemini API key saved");
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Gemini API Key — every admin configures their own */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" />
            Your Gemini API Key
          </CardTitle>
          <CardDescription>
            Each admin uses their own free Gemini key (Google AI Studio). Your key is stored privately and never shared.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gemini-key">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="gemini-key"
                  type={showKey ? "text" : "password"}
                  placeholder="AIzaSy..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSaveGeminiKey} disabled={savingKey}>
                {savingKey ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          {geminiApiKey && (
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Key saved — parsing will use your quota
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Get a free key at{" "}
            <span className="font-mono text-foreground">aistudio.google.com</span>
            {" "}→ Get API key → Create API key
          </p>
        </CardContent>
      </Card>

      {/* Admin UID Management — primary admin only */}
      {isPrimaryAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Authorized Admins
            </CardTitle>
            <CardDescription>
              Add team members by their Firebase UID. They'll see the admin panel after signing in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current admin list */}
            <div className="space-y-2">
              {adminUids.map((uid) => (
                <div key={uid} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="font-mono text-xs truncate">{uid}</span>
                    {uid === PRIMARY_ADMIN_UID && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">Primary</Badge>
                    )}
                  </div>
                  {uid !== PRIMARY_ADMIN_UID && (
                    <button
                      onClick={() => handleRemoveAdmin(uid)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <ShieldX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Add new admin */}
            <div className="space-y-1.5">
              <Label htmlFor="new-uid">Add Admin by UID</Label>
              <div className="flex gap-2">
                <Input
                  id="new-uid"
                  placeholder="Firebase UID (e.g. abc123...)"
                  value={newUid}
                  onChange={(e) => setNewUid(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleAddAdmin()}
                  className="font-mono text-sm"
                />
                <Button onClick={handleAddAdmin} disabled={addingUid} className="gap-1.5 shrink-0">
                  <UserPlus className="h-4 w-4" />
                  {addingUid ? "Adding..." : "Add"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Team member finds their UID: sign in → open browser console → type{" "}
                <span className="font-mono text-foreground">firebase.auth().currentUser.uid</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
