/**
 * Admin Job Queue Component
 * Displays upload jobs with status tracking
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  collection, query, orderBy, limit, onSnapshot,
  doc, updateDoc, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdmin } from "@/contexts/AdminContext";
import type { ContentUploadJob } from "@/types/upload";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw
} from "lucide-react";

const STATUS_CONFIG = {
  queued: {
    label: "Queued",
    icon: Clock,
    variant: "secondary" as const,
    color: "text-muted-foreground",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    variant: "default" as const,
    color: "text-blue-600",
  },
  review: {
    label: "Needs Review",
    icon: AlertCircle,
    variant: "outline" as const,
    color: "text-amber-600",
  },
  published: {
    label: "Published",
    icon: CheckCircle2,
    variant: "default" as const,
    color: "text-green-600",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    variant: "destructive" as const,
    color: "text-red-600",
  },
};

interface JobQueueProps {
  refreshTrigger?: number;
}

export function JobQueue({ refreshTrigger }: JobQueueProps) {
  const { geminiApiKey } = useAdmin();
  const [jobs, setJobs] = useState<ContentUploadJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time subscription to upload jobs
    const q = query(
      collection(db, "contentUploads"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const jobsData: ContentUploadJob[] = [];
        snapshot.forEach((doc) => {
          jobsData.push({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore Timestamp to number
            createdAt: doc.data().createdAt?.toMillis?.() || Date.now(),
            processedAt: doc.data().processedAt?.toMillis?.() || undefined,
            reviewedAt: doc.data().reviewedAt?.toMillis?.() || undefined,
            publishedAt: doc.data().publishedAt?.toMillis?.() || undefined,
          } as ContentUploadJob);
        });
        setJobs(jobsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading jobs:", error);
        toast.error("Failed to load upload queue");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [refreshTrigger]);

  const handleParse = async (job: ContentUploadJob) => {
    const workerUrl = import.meta.env.VITE_WORKER_URL || "http://localhost:8787";
    const jobRef = doc(db, "contentUploads", job.id);

    try {
      // Mark as processing
      await updateDoc(jobRef, { status: "processing", processingStartedAt: Date.now() });

      if (!geminiApiKey) {
        toast.error("No Gemini API key saved. Go to Settings tab to add your key.");
        setUploading && null;
        await updateDoc(jobRef, { status: "queued" });
        return;
      }

      const response = await fetch(`${workerUrl}/api/parse-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfUrl: job.pdfUrl,
          subject: job.subject,
          chapterId: job.chapterId ?? "",
          contentType: job.contentType,
          jobId: job.id,
          geminiApiKey,
          pageRange: (job as any).pageRange ?? "",
        }),
      });

      const result = await response.json() as any;

      if (!response.ok || !result.success) {
        await updateDoc(jobRef, {
          status: "failed",
          errorMessage: result.error ?? "Parsing failed",
          processedAt: Date.now(),
        });
        toast.error("Parsing failed: " + (result.error ?? "Unknown error"));
        return;
      }

      const extracted = result.extracted;
      const count = extracted?.questions?.length ?? extracted?.sections?.length ?? 0;

      const extractedData: Record<string, any> = {
        confidence: extracted?.overallConfidence ?? 0,
        processingTime: 0,
        pagesProcessed: 0,
      };
      if (job.contentType === "questions") {
        extractedData.questionsCount = count;
        extractedData.questions = extracted?.questions ?? [];
      } else {
        extractedData.notesBlocks = extracted?.sections ?? [];
      }

      // Save extracted data and mark as review
      await updateDoc(jobRef, {
        status: "review",
        processedAt: Date.now(),
        processingDuration: Date.now() - (job.processingStartedAt ?? Date.now()),
        extractedData,
      });

      const keyLabel = result.keySource === "admin-key" ? "your Gemini key" : "⚠️ env fallback key";
      const usage = extracted?._tokenUsage;
      const tokenInfo = usage ? ` (${usage.outputTokens}/${usage.outputLimit} output tokens${usage.hitLimit ? " — HIT LIMIT" : ""})` : "";
      toast.success(`Parsed ${count} ${job.contentType === "questions" ? "questions" : "sections"} using ${keyLabel}.${tokenInfo} Ready for review.`);
    } catch (error: any) {
      await updateDoc(jobRef, {
        status: "failed",
        errorMessage: error.message ?? "Unexpected error",
        processedAt: Date.now(),
      });
      toast.error("Parse error: " + error.message);
    }
  };

  const handleRetry = async (job: ContentUploadJob) => {
    const jobRef = doc(db, "contentUploads", job.id);
    try {
      await updateDoc(jobRef, {
        status: "queued",
        retryCount: (job.retryCount ?? 0) + 1,
        errorMessage: null,
        errorDetails: null,
      });
      toast.success("Job queued for retry");
    } catch (error) {
      console.error("Retry error:", error);
      toast.error("Failed to retry job");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload Queue</CardTitle>
          <CardDescription>No uploads yet. Upload a PDF to get started.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Queue</CardTitle>
        <CardDescription>
          {jobs.length} upload job{jobs.length !== 1 ? "s" : ""} · Real-time updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const statusConfig = STATUS_CONFIG[job.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[200px]" title={job.fileName}>
                          {job.fileName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{job.subject}</span>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-sm text-muted-foreground">
                        {job.contentType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig.variant} className="gap-1.5">
                        <StatusIcon
                          className={`h-3.5 w-3.5 ${
                            job.status === "processing" ? "animate-spin" : ""
                          }`}
                        />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(job.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatFileSize(job.fileSize)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {job.status === "queued" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleParse(job)}
                            className="h-8 gap-1.5"
                          >
                            Parse
                          </Button>
                        )}
                        {job.status === "failed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRetry(job)}
                            className="h-8 gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Retry
                          </Button>
                        )}
                        {job.status === "review" && (
                          <Button size="sm" variant="default" asChild className="h-8 gap-1.5">
                            <Link to="/admin/review/$jobId" params={{ jobId: job.id }}>
                              Review
                            </Link>
                          </Button>
                        )}
                        {job.pdfUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(job.pdfUrl, "_blank")}
                            className="h-8 w-8 p-0"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Summary */}
        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-6 text-sm">
            {Object.entries(
              jobs.reduce((acc, job) => {
                acc[job.status] = (acc[job.status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([status, count]) => {
              const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <div key={status} className="flex items-center gap-1.5">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="text-muted-foreground">
                    {count} {config.label.toLowerCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
