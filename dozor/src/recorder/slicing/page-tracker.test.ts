import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../logger";
import { PageTracker } from "./page-tracker";

describe("PageTracker", () => {
  let trackers: PageTracker[] = [];

  afterEach(() => {
    trackers.forEach((t) => t.destroy());
    trackers = [];
    history.replaceState(null, "", "/");
  });

  function track(callback: ReturnType<typeof vi.fn>) {
    const t = new PageTracker(callback, createLogger(false));
    trackers.push(t);
    return t;
  }

  it("invokes the callback on history.pushState navigation", () => {
    const callback = vi.fn();
    track(callback);

    history.pushState(null, "", "/checkout");

    expect(callback).toHaveBeenCalledWith(location.href, "/checkout");
  });

  it("invokes the callback on history.replaceState navigation", () => {
    const callback = vi.fn();
    track(callback);

    history.replaceState(null, "", "/dashboard");

    expect(callback).toHaveBeenCalledWith(location.href, "/dashboard");
  });

  it("registers a popstate listener that destroy() removes (regression)", () => {
    // We can't change location.href in jsdom (Web IDL binding, non-configurable),
    // so we verify popstate handling indirectly: addEventListener was called
    // for "popstate" at construction, and destroy removes it.
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const tracker = track(vi.fn());
    expect(addSpy).toHaveBeenCalledWith("popstate", expect.any(Function));

    tracker.destroy();
    trackers = trackers.filter((t) => t !== tracker);

    expect(removeSpy).toHaveBeenCalledWith("popstate", expect.any(Function));
  });

  it("does not invoke the callback when the URL is unchanged", () => {
    const callback = vi.fn();
    track(callback);

    history.pushState(null, "", location.pathname);

    expect(callback).not.toHaveBeenCalled();
  });

  it("destroy() restores original history methods and removes popstate listener", () => {
    const callback = vi.fn();
    const tracker = track(callback);
    const patchedPushState = history.pushState;

    tracker.destroy();
    trackers = trackers.filter((t) => t !== tracker);

    expect(history.pushState).not.toBe(patchedPushState);

    history.pushState(null, "", "/after-destroy");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(callback).not.toHaveBeenCalled();
  });
});
