import type { MouseEvent } from "react";

// Clicking a link to the page you're already on does nothing: no duplicate history entry, no refetch.
// Only preventDefault is called, so the click still bubbles up to parents such as the mobile drawer.
//
// After a click that navigates, further in-app link clicks are ignored until the URL changes. Without this,
// repeated taps while a page loads stack history entries and start overlapping navigations.
const LOCK_TIMEOUT_MS = 15_000;
let locked = false;
let releaseTimer: ReturnType<typeof setTimeout> | undefined;

export function releaseNavigationLock() {
  locked = false;
  clearTimeout(releaseTimer);
}

// Returns true when the click should go on to the link's own handlers. Blocked clicks skip them, so analytics
// events attached to a link don't fire for a tap that never navigates.
export function claimLinkClick(event: MouseEvent<HTMLAnchorElement>, isCurrent = false): boolean {
  const url = new URL(event.currentTarget.href);
  // External links and mailto: never take part in the lock.
  if (url.origin !== window.location.origin) return true;
  // New-tab and new-window clicks leave this page as it is.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return true;

  if (isCurrent || locked) {
    event.preventDefault();
    return false;
  }
  // Same document (hash-only or identical URL): no route change, so there is nothing to wait for.
  if (url.pathname === window.location.pathname && url.search === window.location.search) return true;

  locked = true;
  // Fallback in case the navigation never lands, so the links can't stay blocked.
  releaseTimer = setTimeout(releaseNavigationLock, LOCK_TIMEOUT_MS);
  return true;
}

export function skipCurrentPageClick(isCurrent: boolean) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    claimLinkClick(event, isCurrent);
  };
}
