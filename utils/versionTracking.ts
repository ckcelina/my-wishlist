
/**
 * Version Tracking Utility - Minimal Implementation
 * 
 * This is a minimal stub that satisfies the ErrorBoundary's requirement
 * for a trackAppVersion function. It does nothing but return successfully.
 * 
 * This prevents crashes when ErrorBoundary tries to call version tracking.
 */

/**
 * Track app version - minimal no-op implementation
 * 
 * This function exists solely to prevent crashes in ErrorBoundary.
 * It performs no side effects and always succeeds.
 * 
 * @returns Promise that resolves immediately
 */
export async function trackAppVersion(): Promise<void> {
  // Minimal body as per requirement - no side effects
  // This function intentionally does nothing to prevent crashes
  return Promise.resolve();
}

// Default export for compatibility (some bundlers may need this)
export default {
  trackAppVersion,
};
