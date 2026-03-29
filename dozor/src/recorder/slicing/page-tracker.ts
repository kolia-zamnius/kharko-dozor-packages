import type { Logger } from "../logger";

export type PageChangeCallback = (url: string, pathname: string) => void;

/**
 * Monitors URL changes in single-page applications.
 * Intercepts `history.pushState`, `history.replaceState`, and the `popstate` event.
 */
export class PageTracker {
  private callback: PageChangeCallback;
  private lastUrl: string;
  private origPushState: typeof history.pushState;
  private origReplaceState: typeof history.replaceState;
  private logger: Logger;

  constructor(callback: PageChangeCallback, logger: Logger) {
    this.callback = callback;
    this.logger = logger;
    this.lastUrl = location.href;

    this.logger.log("PageTracker: initialized (url: %s)", this.lastUrl);

    // Save originals
    this.origPushState = history.pushState.bind(history);
    this.origReplaceState = history.replaceState.bind(history);

    // Monkey-patch pushState
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      this.origPushState(...args);
      this.check();
    };

    // Monkey-patch replaceState
    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      this.origReplaceState(...args);
      this.check();
    };

    // Browser back/forward
    addEventListener("popstate", this.onPopState);
  }

  /** Remove listeners and restore original history methods. */
  destroy(): void {
    history.pushState = this.origPushState;
    history.replaceState = this.origReplaceState;
    removeEventListener("popstate", this.onPopState);
    this.logger.log("PageTracker: destroyed");
  }

  private onPopState = (): void => {
    this.check();
  };

  private check(): void {
    const url = location.href;
    if (url === this.lastUrl) return;
    this.logger.log("PageTracker: navigation detected (%s → %s)", this.lastUrl, url);
    this.lastUrl = url;
    this.callback(url, location.pathname);
  }
}
