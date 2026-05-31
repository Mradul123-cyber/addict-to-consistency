/**
 * Admin Upload Form Component
 * Handles PDF uploads to Firebase Storage and job creation
 */

import { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "@/lib/firebase";
import { getCurrentUid } from "@/lib/admin-auth";
import type { Subject, ContentType } from "@/types/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileText, AlertCircle } from "lucide-react";

interface UploadFormProps {
  onUploadComplete?: () => void;
}

export function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState<Subject>("physics");
  const [chapterId, setChapterId] = useState<string>("");
  const [contentType, setContentType] = useState<ContentType>("questions");
  const [pageRange, setPageRange] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Please select a PDF file");
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        // 50MB limit
        toast.error("File size must be less than 50MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (!chapterId.trim() && contentType === "questions") {
      toast.error("Chapter ID is required for questions");
      return;
    }

    const uid = getCurrentUid();
    if (!uid) {
      toast.error("You must be signed in to upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload to Firebase Storage
      const timestamp = Date.now();
      const fileName = `${subject}_${contentType}_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `content-uploads/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Monitor upload progress
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Upload error:", error);
          toast.error("Upload failed: " + error.message);
          setUploading(false);
        },
        async () => {
          // Upload complete, get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Create upload job in Firestore
          const jobData: Record<string, any> = {
            uploadedBy: uid,
            createdAt: serverTimestamp(),
            pdfUrl: downloadURL,
            fileName: file.name,
            fileSize: file.size,
            subject,
            contentType,
            status: "queued",
            retryCount: 0,
          };
          if (chapterId.trim()) jobData.chapterId = chapterId.trim();
          if (pageRange.trim()) jobData.pageRange = pageRange.trim();

          await addDoc(collection(db, "contentUploads"), jobData);

          toast.success("Upload successful! Job created.");

          // Reset form
          setFile(null);
          setChapterId("");
          setUploadProgress(0);
          setUploading(false);

          // Notify parent
          onUploadComplete?.();

          // Reset file input
          const fileInput = document.getElementById("file-upload") as HTMLInputElement;
          if (fileInput) fileInput.value = "";
        }
      );
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to create upload job");
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Content
        </CardTitle>
        <CardDescription>
          Upload PDF files for AI parsing. Questions and notes will be extracted and queued for review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">PDF File</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="flex-1"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            )}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Select value={subject} onValueChange={(v) => setSubject(v as Subject)} disabled={uploading}>
            <SelectTrigger id="subject">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="physics">Physics</SelectItem>
              <SelectItem value="chemistry">Chemistry</SelectItem>
              <SelectItem value="maths">Mathematics</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Chapter ID */}
        <div className="space-y-2">
          <Label htmlFor="chapter-id">
            Chapter ID {contentType === "questions" && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="chapter-id"
            type="text"
            placeholder="e.g., phy-5, chem-3, math-10"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            disabled={uploading}
          />
          <p className="text-xs text-muted-foreground">
            Must match existing chapter IDs from curriculum tracks
          </p>
        </div>

        {/* Page Range */}
        <div className="space-y-2">
          <Label htmlFor="page-range">Page Range <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            id="page-range"
            type="text"
            placeholder="e.g. 1-50  or  51-100  or  leave blank for all pages"
            value={pageRange}
            onChange={(e) => setPageRange(e.target.value)}
            disabled={uploading}
          />
          <p className="text-xs text-muted-foreground">
            For large PDFs (100+ questions), split into batches — upload the same PDF multiple times with different ranges.
          </p>
        </div>

        {/* Content Type */}
        <div className="space-y-2">
          <Label htmlFor="content-type">Content Type</Label>
          <Select
            value={contentType}
            onValueChange={(v) => setContentType(v as ContentType)}
            disabled={uploading}
          >
            <SelectTrigger id="content-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="questions">Questions (MCQ, Numerical, etc.)</SelectItem>
              <SelectItem value="notes">Notes (Short notes, formulas)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium tabular-nums">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Warning */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-amber-900 dark:text-amber-100">Important</p>
            <p className="text-amber-800 dark:text-amber-200">
              Uploaded PDFs will be queued for AI parsing. Review all extracted content before publishing to
              ensure JEE accuracy.
            </p>
          </div>
        </div>

        {/* Upload Button */}
        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
          {uploading ? "Uploading..." : "Upload PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}
