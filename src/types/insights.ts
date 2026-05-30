/**
 * Concept-Insights Types
 * Type definitions for AI-powered recommendations and learning analytics
 */

import type { Subject } from "./questions";

export type WeaknessType = "accuracy" | "speed" | "both";

export type RecommendationReason =
  | "weak-accuracy"
  | "insufficient-practice"
  | "spaced-repetition"
  | "never-attempted"
  | "inconsistent-performance";

/**
 * Topic-level performance insight
 */
export interface TopicInsight {
  chapterId: string;
  chapterName: string;
  subject: Subject;

  // Performance metrics
  accuracy: number; // Percentage (0-100)
  averageTimePerQuestion: number; // Seconds
  questionsAttempted: number;
  correctCount: number;
  incorrectCount: number;

  // Diagnosis
  weakness: WeaknessType;
  recommendedDifficulty: number; // 1-5, suggested difficulty for next practice
  confidenceLevel: "low" | "medium" | "high"; // Based on number of attempts

  // Trends
  recentImprovement: boolean; // Last 7 days vs previous period
  lastAttemptedAt: number; // Unix timestamp
}

/**
 * Spaced repetition schedule for a chapter
 */
export interface SpacedRepetitionItem {
  chapterId: string;
  chapterName: string;
  subject: Subject;
  lastPracticed: number; // Unix timestamp
  intervalDays: number; // Days until next review
  nextReviewDate: number; // Unix timestamp
  repetitionCount: number; // How many times reviewed
  currentAccuracy: number; // Last session accuracy
  easeFactor: number; // SM-2 algorithm ease factor (typically 1.3 - 2.5)
}

/**
 * Practice recommendation
 */
export interface PracticeRecommendation {
  chapterId: string;
  chapterName: string;
  subject: Subject;
  reason: RecommendationReason;
  priority: number; // 1-5, higher = more urgent
  estimatedDuration: number; // Estimated minutes to improve
  targetAccuracy: number; // Goal accuracy percentage
  suggestedQuestionCount: number; // Number of questions to practice
}

/**
 * Main Concept-Insights document
 * Firestore path: users/{userId}/insights/current
 */
export interface ConceptInsight {
  id: string;
  userId: string;
  generatedAt: number; // Unix timestamp

  // Weak areas
  weakTopics: TopicInsight[]; // Sorted by severity (weakest first)

  // Study recommendations
  nextStudyTopics: string[]; // Chapter IDs prioritized for today's study
  recommendedPractice: PracticeRecommendation[];

  // Spaced repetition
  dueForReview: SpacedRepetitionItem[]; // Chapters due for review today

  // Overall metrics
  overallAccuracy: number; // Across all attempts (0-100)
  studyConsistency: number; // Based on session logs (0-100)
  strengthAreas: string[]; // High-performing chapter IDs (>80% accuracy)

  // Trends
  accuracyTrend: "improving" | "stable" | "declining";
  practiceFrequency: "daily" | "frequent" | "occasional" | "rare";
  totalQuestionsAttempted: number;
  totalPracticeMinutes: number;
}

/**
 * Insight generation configuration
 */
export interface InsightConfig {
  weakTopicThreshold: number; // Accuracy below this is considered weak (default: 60%)
  strongTopicThreshold: number; // Accuracy above this is strong (default: 80%)
  minAttemptsForInsight: number; // Minimum attempts needed for reliable insight (default: 5)
  lookbackDays: number; // Days to look back for trend analysis (default: 30)
  maxRecommendations: number; // Max recommendations to show (default: 5)
}

export const DEFAULT_INSIGHT_CONFIG: InsightConfig = {
  weakTopicThreshold: 60,
  strongTopicThreshold: 80,
  minAttemptsForInsight: 5,
  lookbackDays: 30,
  maxRecommendations: 5,
};

/**
 * Learning velocity (rate of improvement)
 */
export interface LearningVelocity {
  chapterId: string;
  subject: Subject;
  initialAccuracy: number; // Accuracy in first 5 attempts
  currentAccuracy: number; // Accuracy in last 5 attempts
  improvementRate: number; // Percentage points improved per week
  daysActive: number; // Days since first attempt
  isImproving: boolean;
}

/**
 * Study session recommendation for dashboard
 */
export interface DailyStudyPlan {
  userId: string;
  date: string; // YYYY-MM-DD
  generatedAt: number;

  // Prioritized tasks
  practiceChapters: {
    chapterId: string;
    chapterName: string;
    subject: Subject;
    reason: string;
    estimatedMinutes: number;
  }[];

  // Spaced repetition
  reviewChapters: {
    chapterId: string;
    chapterName: string;
    subject: Subject;
    questionCount: number;
  }[];

  // Challenges
  dailyChallenge?: {
    chapterId: string;
    chapterName: string;
    subject: Subject;
    difficulty: number;
    questionCount: number;
  };

  totalEstimatedMinutes: number;
}

/**
 * Mastery level for a chapter
 */
export interface ChapterMastery {
  chapterId: string;
  chapterName: string;
  subject: Subject;
  masteryLevel: "beginner" | "intermediate" | "proficient" | "expert";
  masteryPercentage: number; // 0-100
  questionsAttempted: number;
  accuracy: number;
  averageTimeEfficiency: number; // Compared to expected time (1.0 = on par, <1.0 = faster)
  lastUpdated: number;
}
