"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export type ToastConfig = {
  param: string;
  type: "success" | "error";
  // A single message for any truthy value, or a lookup by the param's value.
  message: string | Record<string, string>;
};

// Reads one-off feedback out of redirect query params (e.g. ?saved=1, ?error=invalid),
// shows it as a toast, then strips the param so refresh/back-nav doesn't re-fire it.
export function ToastOnLoad({ configs }: { configs: ToastConfig[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = searchParams.toString();

  useEffect(() => {
    const params = new URLSearchParams(query);
    let changed = false;
    for (const config of configs) {
      const value = params.get(config.param);
      if (value === null) continue;
      const text = typeof config.message === "string" ? config.message : config.message[value] ?? "Something went wrong.";
      if (config.type === "error") toast.error(text);
      else toast.success(text);
      params.delete(config.param);
      changed = true;
    }
    if (changed) {
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- configs is a stable inline literal per page
  }, [query]);

  return null;
}
