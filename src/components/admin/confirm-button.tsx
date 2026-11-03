"use client";

import { useId, useRef } from "react";
import { buttonClasses } from "@/components/button/button";

// Opens an in-page confirmation dialog. Yes submits the surrounding form (or `formAction`).
// The native <dialog> gives the centered panel, backdrop, inert background, and Escape-to-cancel.
export function ConfirmButton({
  children,
  confirmText = "Are you sure?",
  className,
  formAction,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  confirmText?: string;
  className?: string;
  formAction?: (formData: FormData) => void;
  "aria-label"?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className={`cursor-pointer ${className ?? ""}`}
      >
        {children}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          // Clicks on the backdrop land on the <dialog> itself, outside its panel.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-md border border-border bg-background p-0 text-foreground shadow-xl backdrop:bg-foreground/40"
      >
        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-2">
            <h2 id={titleId} className="text-lg font-semibold">
              Are you sure?
            </h2>
            <p className="text-sm text-muted">{confirmText}</p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className={buttonClasses({ variant: "inverse" })}
            >
              Cancel
            </button>
            <button type="submit" formAction={formAction} className={buttonClasses({ variant: "danger" })}>
              Yes
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
