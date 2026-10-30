"use client";

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
  return (
    <button
      type="submit"
      formAction={formAction}
      className={className}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (!confirm(confirmText)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
