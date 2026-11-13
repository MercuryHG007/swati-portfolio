"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { releaseNavigationLock } from "@/components/current-page-click";

// In-app link clicks are ignored from the first click until the URL changes. This releases that lock once the new URL is in place.
export function NavigationLockRelease() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    releaseNavigationLock();
  }, [pathname, searchParams]);

  return null;
}
