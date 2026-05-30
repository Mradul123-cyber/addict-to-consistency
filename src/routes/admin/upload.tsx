/**
 * Admin Upload Route
 * Protected route for uploading and managing content
 */

import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { UploadForm } from "@/components/admin/UploadForm";
import { JobQueue } from "@/components/admin/JobQueue";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin/upload")({
  head: () => ({
    meta: [
      { title: "Admin Upload — JEE Console" },
      { name: "description", content: "Admin interface for uploading and managing JEE content" },
      { name: "robots", content: "noindex, nofollow" }, // Don't index admin pages
    ],
  }),
  component: AdminUploadPage,
});

function AdminUploadPage() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<"upload" | "settings">("upload");

  if (!user) return <Navigate to="/" />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have admin privileges. Contact the system administrator if you believe this is an
            error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleUploadComplete = () => setRefreshTrigger((prev) => prev + 1);

  return (
    <div className="space-y-6">
      {/* Header + tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Upload content and manage admin access</p>
        </div>
        <div className="flex rounded-lg border p-1 gap-1">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === "upload" ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === "settings" ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            Settings
          </button>
        </div>
      </div>

      {activeTab === "upload" ? (
        <>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Admin Mode</AlertTitle>
            <AlertDescription>
              All uploaded content is queued for AI processing and manual review before publication.
            </AlertDescription>
          </Alert>
          <UploadForm onUploadComplete={handleUploadComplete} />
          <JobQueue refreshTrigger={refreshTrigger} />
        </>
      ) : (
        <AdminSettings />
      )}
    </div>
  );
}
