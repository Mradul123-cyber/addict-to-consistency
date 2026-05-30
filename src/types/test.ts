/**
 * Test Mode Types
 * Type definitions for mock tests and test attempts
 */

import type { Subject } from "./questions";

export type TestType = "mains-mock" | "advanced-mock" | "chapter-test";

/**
 * Single question within a test
 */
export interface TestQuestion {
  questionId: string;
  response: string | string[] | null; // User's answer (null if not attempted)
  isCorrect?: boolean; // Calculated on submission
  timeSpent: number; // Seconds spent on this question
  marked: boolean; // Marked for review
  visitedAt?: number; // Timestamp when first visited
}

/**
 * Test attempt
 * Firestore path: users/{userId}/testAttempts/{attemptId}
 */
export interface TestAttempt {
  id: string;
  userId: string;

  // Test configuration
  testType: TestType;
  subject?: Subject; // For single-subject tests
  chapterIds?: string[]; // For chapter-specific tests

  // Test metadata
  startedAt: number; // Unix timestamp
  submittedAt: number | null; // null if in progress
  duration: number; // Total allowed minutes
  timeRemaining: number; // For pause/resume functionality

  // Questions
  questions: TestQuestion[];

  // Results (calculated on submission)
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  score: number; // JEE scoring (correct * 4 - incorrect * 1 for Mains)
  percentile?: number; // Calculated from all users who took this test

  // Detailed analysis
  subjectWiseScore?: Record<
    Subject,
    {
      total: number;
      correct: number;
      incorrect: number;
      score: number;
    }
  >;
  chapterWiseAccuracy?: Record<string, number>; // chapterId -> accuracy percentage
  difficultyWiseAccuracy?: Record<string, number>; // "1" | "2" | ... -> accuracy percentage
}

/**
 * Test blueprint (pre-defined test structure)
 * Firestore path: testBlueprints/{blueprintId}
 */
export interface TestBlueprint {
  id: string;
  name: string; // e.g., "JEE Mains Mock Test 1"
  description: string;
  testType: TestType;
  duration: number; // Minutes
  questionIds: string[]; // Pre-selected questions
  subjects?: Subject[]; // Subjects covered
  difficulty: number; // Average difficulty (1-5)
  totalMarks: number;
  createdAt: number;
  createdBy: string; // UID of admin
  isActive: boolean; // Whether this test is available to students
}

/**
 * Test scoring configuration
 */
export interface TestScoringConfig {
  correctMarks: number; // Marks for correct answer (typically 4 for Mains)
  incorrectMarks: number; // Negative marks for incorrect (typically -1 for Mains)
  unattemptedMarks: number; // Marks for unattempted (typically 0)
  partialMarks?: number; // For JEE Advanced partial marking
}

/**
 * JEE Mains test configuration
 */
export const JEE_MAINS_CONFIG: TestScoringConfig = {
  correctMarks: 4,
  incorrectMarks: -1,
  unattemptedMarks: 0,
};

/**
 * JEE Advanced test configuration (varies by question type)
 */
export const JEE_ADVANCED_CONFIG: TestScoringConfig = {
  correctMarks: 4,
  incorrectMarks: -2, // More penalty
  unattemptedMarks: 0,
  partialMarks: 1, // For multiple correct type
};

/**
 * Test result summary for display
 */
export interface TestResultSummary {
  attemptId: string;
  testName: string;
  testType: TestType;
  score: number;
  maxScore: number;
  accuracy: number; // Percentage
  percentile?: number;
  rank?: number; // Among all users
  totalUsers?: number; // Total users who took this test
  timeTaken: number; // Minutes
  submittedAt: number;
}

/**
 * Test analytics for a user
 */
export interface UserTestAnalytics {
  userId: string;
  totalTests: number;
  averageScore: number;
  averagePercentile?: number;
  bestScore: number;
  worstScore: number;
  averageAccuracy: number;
  strongSubjects: Subject[];
  weakSubjects: Subject[];
  improvementTrend: "improving" | "stable" | "declining";
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  userId: string;
  userName: string;
  score: number;
  timeTaken: number; // Minutes
  percentile: number;
  rank: number;
}
