/**
 * Question Bank Types
 * Type definitions for JEE questions, options, and metadata
 */

export type Subject = "physics" | "chemistry" | "maths";

export type QuestionType = "mcq-single" | "mcq-multiple" | "numerical" | "integer";

export type ExamPattern = "mains" | "advanced" | "both";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

/**
 * MCQ Option
 */
export interface QuestionOption {
  id: string; // A, B, C, D
  text: string; // Markdown with LaTeX support
}

/**
 * Solution structure with detailed explanation
 */
export interface QuestionSolution {
  approach: string; // Step-by-step explanation (markdown with LaTeX)
  keyInsights: string[]; // Critical points to remember
  commonMistakes?: string[]; // Common JEE traps/mistakes
}

/**
 * Previous year question metadata
 */
export interface PreviousYearQuestion {
  year: number; // e.g., 2023
  exam: "JEE Mains" | "JEE Advanced";
  shift?: string; // For JEE Mains (e.g., "Shift 1", "Shift 2")
}

/**
 * Main Question interface
 * Firestore path: questions/{questionId}
 */
export interface Question {
  id: string;
  subject: Subject;
  chapterId: string; // Links to existing Chapter.id from tracks
  topic: string; // Granular topic within chapter (e.g., "Circular Motion", "SHM")

  // Question content
  statement: string; // Question text in markdown with LaTeX (use \(...\) for inline, \[...\] for block)
  type: QuestionType;
  options?: QuestionOption[]; // Only for MCQ types
  correctAnswer: string | string[]; // Single ID (e.g., "A") or array for multiple correct (e.g., ["A", "C"])
  numericalAnswer?: number; // For numerical type
  tolerance?: number; // Acceptable error margin for numerical answers (e.g., 0.01)

  // Progressive hints (shown one-by-one in practice mode)
  hints?: string[]; // [subtle nudge, concept pointer, near-answer]

  // Solution
  solution: QuestionSolution;

  // Metadata
  difficulty: Difficulty; // 1 = easiest, 5 = JEE Advanced level
  examPattern: ExamPattern;
  previousYearQuestion?: PreviousYearQuestion;
  tags: string[]; // For multi-concept questions (e.g., ["work-energy", "friction"])

  // Admin fields
  uploadedAt: number; // Unix timestamp
  uploadedBy: string; // UID of uploader
  reviewStatus: ReviewStatus;
  reviewedBy?: string; // UID of reviewer
  reviewedAt?: number; // Unix timestamp
  sourceDocument?: string; // Reference to original PDF filename or URL
}

/**
 * Question filter criteria for fetching
 */
export interface QuestionFilter {
  subject?: Subject;
  chapterIds?: string[];
  difficulty?: Difficulty | Difficulty[];
  examPattern?: ExamPattern;
  type?: QuestionType;
  tags?: string[];
  excludeIds?: string[]; // Already attempted questions
  reviewStatus?: ReviewStatus;
  limit?: number;
}

/**
 * Question statistics for admin dashboard
 */
export interface QuestionStats {
  total: number;
  bySubject: Record<Subject, number>;
  byDifficulty: Record<Difficulty, number>;
  byReviewStatus: Record<ReviewStatus, number>;
  byExamPattern: Record<ExamPattern, number>;
}
