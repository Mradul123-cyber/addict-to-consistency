/**
 * Practice Mode Types
 * Type definitions for practice sessions and attempts
 */

import type { Subject, Difficulty } from "./questions";

/**
 * Single practice attempt for a question
 * Firestore path: users/{userId}/practiceAttempts/{attemptId}
 */
export interface PracticeAttempt {
  id: string;
  userId: string;
  questionId: string;

  // Attempt details
  startedAt: number; // Unix timestamp
  submittedAt: number; // Unix timestamp
  timeSpentSeconds: number; // Time spent on this question

  // Response
  selectedAnswer: string | string[]; // User's answer (option ID or numerical value)
  isCorrect: boolean;

  // Learning data
  hintsUsed: number; // Number of hints viewed (0-3 typically)
  viewedSolution: boolean; // Whether user viewed solution after submission

  // Context (denormalized for faster queries)
  chapterId: string;
  subject: Subject;
  difficulty: Difficulty;
}

/**
 * Practice session configuration
 * Stored in local state during session, not in Firestore
 */
export interface PracticeSession {
  id: string;
  userId: string;
  subject: Subject;
  chapterIds: string[];
  difficulty?: Difficulty; // Optional filter
  questionIds: string[]; // Pre-fetched question IDs for this session
  currentIndex: number; // Current question index (0-based)
  startedAt: number;
}

/**
 * Practice session summary (calculated from attempts)
 */
export interface PracticeSessionSummary {
  sessionId: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  accuracy: number; // Percentage (0-100)
  averageTimePerQuestion: number; // Seconds
  totalHintsUsed: number;
  solutionsViewed: number;
  completedAt: number;
}

/**
 * Performance by chapter (for analytics)
 */
export interface ChapterPerformance {
  chapterId: string;
  chapterName: string;
  subject: Subject;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number; // Percentage (0-100)
  averageTimePerQuestion: number; // Seconds
  lastAttemptedAt: number; // Unix timestamp
}

/**
 * Practice history filter
 */
export interface PracticeHistoryFilter {
  userId: string;
  chapterId?: string;
  subject?: Subject;
  startDate?: number; // Unix timestamp
  endDate?: number; // Unix timestamp
  minAccuracy?: number; // Percentage (0-100)
  maxAccuracy?: number; // Percentage (0-100)
}
