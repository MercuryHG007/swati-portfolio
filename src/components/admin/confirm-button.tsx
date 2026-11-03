"use client";

import { useId, useRef } from "react";
import { buttonClasses } from "@/components/button/button";
import { AdminDialog } from "./admin-dialog";

// Opens an in-page confirmation dialog. Yes submits the surrounding form (or `formAction`).
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
      <AdminDialog dialogRef={dialogRef} titleId={titleId}>
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-lg font-semibold">
            Are you sure?
          </h2>
          <p className="text-sm text-muted">{confirmText}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => dialogRef.current?.close()} className={buttonClasses({ variant: "inverse" })}>
            Cancel
          </button>
          <button type="submit" formAction={formAction} className={buttonClasses({ variant: "danger" })}>
            Yes
          </button>
        </div>
      </AdminDialog>
    </>
  );
}

