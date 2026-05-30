/**
 * Publish reviewed questions to the live questions collection
 */

import { collection, doc, writeBatch, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { nanoid } from "nanoid";
import type { Question } from "@/types/questions";

export interface ReviewedQuestion {
  approved: boolean;
  statement: string;
  type: "mcq-single" | "mcq-multiple" | "numerical" | "integer";
  options?: { id: string; text: string }[];
  correctAnswer: string | string[];
  numericalAnswer?: number;
  tolerance?: number;
  hints?: string[];
  solution: {
    approach: string;
    keyInsights: string[];
    commonMistakes?: string[];
  };
  difficulty: number;
  tags: string[];
  confidence: number;
}

export async function publishQuestions(
  jobId: string,
  subject: string,
  chapterId: string,
  reviewedQuestions: ReviewedQuestion[],
  uploadedBy: string
): Promise<{ published: number; skipped: number }> {
  const approved = reviewedQuestions.filter((q) => q.approved);
  if (approved.length === 0) return { published: 0, skipped: reviewedQuestions.length };

  // Firestore batch writes (max 500 per batch)
  const batch = writeBatch(db);
  const publishedIds: string[] = [];

  for (const q of approved) {
    const id = nanoid();
    const questionRef = doc(collection(db, "questions"), id);

    const questionData: Omit<Question, "id"> = {
      subject: subject as Question["subject"],
      chapterId,
      topic: q.tags[0] ?? chapterId,
      statement: q.statement,
      type: q.type,
      solution: {
        approach: q.solution.approach,
        keyInsights: q.solution.keyInsights,
        commonMistakes: q.solution.commonMistakes ?? [],
      },
      difficulty: q.difficulty as Question["difficulty"],
      examPattern: "both",
      tags: q.tags,
      uploadedAt: Date.now(),
      uploadedBy,
      reviewStatus: "approved",
      reviewedBy: uploadedBy,
      reviewedAt: Date.now(),
      sourceDocument: jobId,
    };

    // Only add optional fields if they have values
    if (q.options?.length) (questionData as any).options = q.options;
    if (q.correctAnswer) (questionData as any).correctAnswer = q.correctAnswer;
    if (q.numericalAnswer != null) (questionData as any).numericalAnswer = q.numericalAnswer;
    if (q.tolerance != null) (questionData as any).tolerance = q.tolerance;
    if (q.hints?.length) (questionData as any).hints = q.hints;

    batch.set(questionRef, questionData);
    publishedIds.push(id);
  }

  await batch.commit();

  // Mark job as published
  await updateDoc(doc(db, "contentUploads", jobId), {
    status: "published",
    publishedAt: serverTimestamp(),
    publishedQuestionIds: publishedIds,
  });

  return { published: approved.length, skipped: reviewedQuestions.length - approved.length };
}
