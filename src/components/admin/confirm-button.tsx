"use client";

export function ConfirmButton({
  children,
  confirmText = "Are you sure?",
  className,
  formAction,
}: {
  children: React.ReactNode;
  confirmText?: string;
  className?: string;
  formAction?: (formData: FormData) => void;
}) {
  return (
    <button
      type="submit"
      formAction={formAction}
      className={className}
      onClick={(event) => {
        if (!confirm(confirmText)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
