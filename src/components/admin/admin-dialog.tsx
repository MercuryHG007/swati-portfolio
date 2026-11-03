"use client";

import type { ReactNode, RefObject } from "react";

// Native <dialog> shell: centered panel, backdrop, inert background, Escape to close.
// Clicking the backdrop (the <dialog> itself, outside the panel) closes it too.
export function AdminDialog({
  dialogRef,
  titleId,
  onClose,
  children,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  titleId: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-md border border-border bg-background p-0 text-foreground shadow-xl backdrop:bg-foreground/40"
    >
      <div className="flex flex-col gap-6 p-6">{children}</div>
    </dialog>
  );
}
