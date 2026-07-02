/** User-facing message from a Convex mutation/query error. */
export function formatConvexError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Something went wrong. Please try again.";
  }

  const msg = error.message;

  if (msg === "Unauthorized") {
    return "Please sign in again to continue.";
  }
  if (msg === "User not found in organization") {
    return "Your account is not synced to this practice yet. Try refreshing the page.";
  }
  if (msg.startsWith("Forbidden:")) {
    return msg.slice("Forbidden:".length).trim();
  }
  if (msg.startsWith("Forbidden")) {
    return "You don't have permission to do that.";
  }

  return msg;
}
