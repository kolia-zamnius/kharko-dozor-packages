import type { Logger } from "../logger";

const SESSION_KEY = "dozor_session_id";

/** Get or create a session ID persisted in sessionStorage for SPA continuity. */
export function getSessionId(logger: Logger): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) {
      logger.log("Session: restored existing (%s)", existing);
      return existing;
    }
  } catch {
    // sessionStorage unavailable (SSR, iframe sandbox, etc.)
    logger.warn("Session: sessionStorage unavailable — ID will not persist");
  }

  const id = crypto.randomUUID();
  logger.log("Session: created new (%s)", id);

  try {
    sessionStorage.setItem(SESSION_KEY, id);
  } catch {
    // best-effort persistence
  }

  return id;
}

/** Remove the session ID from sessionStorage so the next init() creates a fresh session. */
export function clearSessionId(logger: Logger): void {
  logger.log("Session: cleared");
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // best-effort
  }
}
