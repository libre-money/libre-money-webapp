import { User } from "src/models/user";

const PREVIOUS_SESSION_KEY = "--lm-previous-session";

export interface PreviousSession {
  user: User;
  logoutAt: number;
}

class PreviousSessionService {
  /**
   * Stores previous session information when user logs out
   */
  storePreviousSession(user: User): void {
    const session: PreviousSession = {
      user,
      logoutAt: Date.now(),
    };

    localStorage.setItem(PREVIOUS_SESSION_KEY, JSON.stringify(session));
  }

  /**
   * Retrieves stored previous session information
   */
  getPreviousSession(): PreviousSession | null {
    try {
      const sessionData = localStorage.getItem(PREVIOUS_SESSION_KEY);
      if (!sessionData) {
        return null;
      }

      const session: PreviousSession = JSON.parse(sessionData);

      // Basic validation
      if (!session.user) {
        return null;
      }

      return session;
    } catch (error) {
      console.error("Error parsing previous session:", error);
      return null;
    }
  }

  /**
   * Clears stored previous session
   */
  clearPreviousSession(): void {
    localStorage.removeItem(PREVIOUS_SESSION_KEY);
  }

  /**
   * Checks if there's a stored previous session
   */
  hasPreviousSession(): boolean {
    return this.getPreviousSession() !== null;
  }

  /**
   * Checks if the previous session was an offline session
   */
  isPreviousSessionOffline(): boolean {
    const session = this.getPreviousSession();
    return session?.user?.isOfflineUser === true;
  }

  /**
   * Checks if the previous session was an online session
   */
  isPreviousSessionOnline(): boolean {
    const session = this.getPreviousSession();
    return session?.user?.isOfflineUser !== true && session !== null;
  }

  /**
   * Formats the logout time for display
   */
  formatLogoutTime(logoutAt: number): string {
    const date = new Date(logoutAt);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return "Less than an hour ago";
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    }
  }
}

export const previousSessionService = new PreviousSessionService();
