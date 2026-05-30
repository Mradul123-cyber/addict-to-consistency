/**
 * Content Upload Types
 * Type definitions for PDF parsing and content management
 */

import type { Subject, Question } from "./questions";
import type { ContentBlock } from "@/lib/matrix-types";

export type ContentType = "questions" | "notes";

export type UploadStatus = "queued" | "processing" | "review" | "published" | "failed";

/**
 * Extracted question data from PDF parsing
 */
export interface ExtractedQuestion {
  statement: string;
  type: "mcq-single" | "mcq-multiple" | "numerical" | "integer";
  options?: { id: string; text: string }[];
  correctAnswer: string | string[];
  numericalAnswer?: number;
  tolerance?: number;
  solution?: {
    approach: string;
    keyInsights: string[];
    commonMistakes?: string[];
  };
  difficulty?: number;
  tags?: string[];
  confidence: number; // AI confidence score (0-1)
  uncertainFields: string[]; // Fields AI is unsure about
}

/**
 * Extracted notes data from PDF parsing
 */
export interface ExtractedNotes {
  blocks: ContentBlock[];
  title?: string;
  summary?: string;
  confidence: number; // AI confidence score (0-1)
}

/**
 * AI extraction results
 */
export interface ExtractionResult {
  questionsCount?: number;
  questions?: ExtractedQuestion[];
  notesBlocks?: ContentBlock[];
  confidence: number; // Overall confidence (0-1)
  processingTime: number; // Milliseconds
  pagesProcessed: number;
  errors?: string[]; // Parsing errors encountered
}

/**
 * Admin corrections to extracted data
 */
export interface ContentCorrection {
  field: string; // Field name that was corrected (e.g., "correctAnswer", "solution.approach")
  originalValue: any;
  correctedValue: any;
  correctedBy: string; // UID
  correctedAt: number; // Unix timestamp
  note?: string; // Why the correction was made
}

/**
 * Content upload job
 * Firestore path: contentUploads/{jobId}
 */
export interface ContentUploadJob {
  id: string;
  uploadedBy: string; // UID of uploader
  createdAt: number; // Unix timestamp

  // Source
  pdfUrl: string; // Firebase Storage URL
  fileName: string;
  fileSize: number; // Bytes
  pageCount?: number; // Total pages in PDF

  // Metadata
  subject: Subject;
  chapterId?: string; // Optional for notes
  contentType: ContentType;

  // Processing
  status: UploadStatus;
  processedAt?: number; // Unix timestamp
  processingStartedAt?: number; // Unix timestamp
  processingDuration?: number; // Milliseconds

  // AI extraction results
  extractedData?: ExtractionResult;

  // Human review
  reviewedBy?: string; // UID
  reviewedAt?: number; // Unix timestamp
  reviewNotes?: string; // Admin notes about the content
  corrections?: ContentCorrection[]; // Admin edits before publishing

  // Publishing
  publishedAt?: number; // Unix timestamp
  publishedQuestionIds?: string[]; // IDs of published questions

  // Error handling
  errorMessage?: string;
  errorDetails?: string; // Stack trace or detailed error
  retryCount: number;
  lastRetryAt?: number; // Unix timestamp
}

/**
 * Upload queue statistics
 */
export interface UploadQueueStats {
  total: number;
  queued: number;
  processing: number;
  review: number;
  published: number;
  failed: number;
  averageProcessingTime: number; // Milliseconds
  successRate: number; // Percentage (0-100)
}

/**
 * Content upload filter for admin dashboard
 */
export interface UploadFilter {
  status?: UploadStatus | UploadStatus[];
  subject?: Subject;
  contentType?: ContentType;
  uploadedBy?: string; // UID
  startDate?: number; // Unix timestamp
  endDate?: number; // Unix timestamp
  minConfidence?: number; // 0-1
  maxConfidence?: number; // 0-1
}

/**
 * Batch upload operation
 */
export interface BatchUpload {
  id: string;
  name: string; // e.g., "Physics Chapter 5-10"
  description?: string;
  uploadedBy: string;
  createdAt: number;
  jobIds: string[]; // Individual upload job IDs
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  status: "in-progress" | "completed" | "partial-failure" | "failed";
}

/**
 * PDF processing configuration
 */
export interface ProcessingConfig {
  enableVision: boolean; // Use Claude vision for images/diagrams
  enableOCR: boolean; // Use OCR for scanned PDFs
  chunkSize: number; // Pages per chunk (for large PDFs)
  maxRetries: number; // Max retry attempts for failed pages
  confidenceThreshold: number; // Min confidence to auto-approve (0-1)
  timeout: number; // Milliseconds per page
}

export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  enableVision: true,
  enableOCR: true,
  chunkSize: 5,
  maxRetries: 2,
  confidenceThreshold: 0.95, // Only auto-approve if >95% confident
  timeout: 30000, // 30 seconds per page
};

/**
 * Content quality metrics
 */
export interface ContentQualityMetrics {
  uploadJobId: string;
  totalItems: number; // Questions or note blocks
  highConfidence: number; // Items with confidence > 0.9
  mediumConfidence: number; // Items with confidence 0.7-0.9
  lowConfidence: number; // Items with confidence < 0.7
  requiresReview: number; // Items flagged for manual review
  averageConfidence: number; // 0-1
  estimatedReviewTime: number; // Minutes
}
