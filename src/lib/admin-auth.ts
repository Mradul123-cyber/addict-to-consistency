/**
 * Admin Authentication Utilities
 * Whitelist-based admin access control
 */

import { auth } from "./firebase";

/**
 * Admin user IDs (UIDs)
 * Add your Firebase Auth UID here to grant admin access
 *
 * To find your UID:
 * 1. Sign in to the app
 * 2. Open browser console
 * 3. Run: firebase.auth().currentUser.uid
 */
const ADMIN_UIDS: string[] = [
  "1tPxrTKc0ZXFhRb0ZngWjp75zJ32", // Primary admin
];

/**
 * Check if the current user is an admin
 */
export function isAdmin(): boolean {
  const user = auth.currentUser;
  if (!user) return false;
  return ADMIN_UIDS.includes(user.uid);
}

/**
 * Check if a specific UID is an admin
 */
export function isAdminUid(uid: string): boolean {
  return ADMIN_UIDS.includes(uid);
}

/**
 * Get current user UID
 */
export function getCurrentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

/**
 * Throw error if user is not admin
 */
export function requireAdmin(): void {
  if (!isAdmin()) {
    throw new Error("Unauthorized: Admin access required");
  }
}

/**
 * Add admin UID (for development/testing)
 * In production, manually edit ADMIN_UIDS array
 */
export function addAdminUid(uid: string): void {
  if (!ADMIN_UIDS.includes(uid)) {
    ADMIN_UIDS.push(uid);
    console.log(`Added admin UID: ${uid}`);
  }
}

/**
 * Get all admin UIDs (for debugging)
 */
export function getAdminUids(): string[] {
  return [...ADMIN_UIDS];
}
