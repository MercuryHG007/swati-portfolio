import { useEffect, useMemo, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ListQueryOptions<T> = {
  // Lets the last state survive returning from an edit screen, which redirects to the bare list URL.
  storageKey: string;
  paramKeys: readonly string[];
  parse: (params: URLSearchParams) => T;
  serialize: (query: T) => URLSearchParams;
};

function subscribeNone() {
  return () => {};
}

function readStored(storageKey: string) {
  try {
    return window.sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStored(storageKey: string, value: string) {
  try {
    window.sessionStorage.setItem(storageKey, value);
  } catch {
    // Storage can be unavailable (private mode); the URL still carries the state.
  }
}

// parse and serialize must be stable (module-level) functions.
// Updates use replaceState, which Next.js reflects in useSearchParams without a server request.
export function useAdminListQuery<T>({ storageKey, paramKeys, parse, serialize }: ListQueryOptions<T>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Null on the server and during hydration, so the first render matches the server output.
  const storedQuery = useSyncExternalStore(
    subscribeNone,
    () => readStored(storageKey),
    () => null
  );

  const hasListParams = Array.from(searchParams.keys()).some((key) => paramKeys.includes(key));
  const source = hasListParams ? searchParams.toString() : (storedQuery ?? "");
  const query = useMemo(() => parse(new URLSearchParams(source)), [source, parse]);

  useEffect(() => {
    if (hasListParams) writeStored(storageKey, serialize(query).toString());
  }, [hasListParams, query, storageKey, serialize]);

  function update(patch: Partial<T>) {
    const params = serialize({ ...query, ...patch });
    // Keep one-off feedback params such as ?saved=1 for the toast.
    searchParams.forEach((value, key) => {
      if (!paramKeys.includes(key)) params.append(key, value);
    });
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  return { query, update };
}
