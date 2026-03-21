import type { Emitter } from "../core/emitter";
import type { Logger } from "../logger";

export class VisibilityManager {
  private onVisibilityChange: () => void;
  private onBeforeUnload: () => void;

  constructor(emitter: Emitter, logger: Logger, options: { pauseOnHidden: boolean }) {
    const { pauseOnHidden } = options;

    logger.log("VisibilityManager: initialized (pauseOnHidden: %s)", pauseOnHidden);

    this.onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        logger.log("VisibilityManager: tab hidden → flushing");
        // Regular async send — visibilitychange fires well before teardown
        emitter.emit("flush:trigger", { reason: "manual" });
        if (pauseOnHidden) {
          logger.log("VisibilityManager: tab hidden → auto-pausing");
          emitter.emit("visibility:hidden");
        }
      } else if (pauseOnHidden) {
        logger.log("VisibilityManager: tab visible → resuming");
        emitter.emit("visibility:visible");
      }
    };

    this.onBeforeUnload = () => {
      logger.log("VisibilityManager: beforeunload → keepalive flush");
      // Keepalive send — page is closing, must be synchronous
      emitter.emit("flush:trigger", { reason: "unload" });
    };

    addEventListener("visibilitychange", this.onVisibilityChange);
    addEventListener("beforeunload", this.onBeforeUnload);
  }

  dispose(): void {
    removeEventListener("visibilitychange", this.onVisibilityChange);
    removeEventListener("beforeunload", this.onBeforeUnload);
  }
}
