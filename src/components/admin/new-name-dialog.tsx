"use client";

import { useId, useRef } from "react";
import { buttonClasses } from "@/components/button/button";
import { AdminDialog } from "./admin-dialog";
import { Field, inputClass } from "./ui";

// Header button that opens a modal with a single required name input. Submits to `action`.
export function NewNameDialog({
  triggerLabel,
  title,
  placeholder,
  action,
}: {
  triggerLabel: string;
  title: string;
  placeholder: string;
  action: (formData: FormData) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className={buttonClasses()}
      >
        {triggerLabel}
      </button>
      <AdminDialog dialogRef={dialogRef} titleId={titleId} onClose={() => formRef.current?.reset()}>
        <h2 id={titleId} className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <form ref={formRef} action={action} className="flex flex-col gap-6">
          <Field label="Name">
            <input name="name" required placeholder={placeholder} className={inputClass} />
          </Field>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className={buttonClasses({ variant: "inverse" })}
            >
              Cancel
            </button>
            <button type="submit" className={buttonClasses()}>
              Save
            </button>
          </div>
        </form>
      </AdminDialog>
    </>
  );
}
