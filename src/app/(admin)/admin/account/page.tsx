import { changePassword } from "./actions";
import { Field, inputClass, buttonClass } from "@/components/admin/ui";
import { ToastOnLoad } from "@/components/admin/toast-on-load";

const ERROR_MESSAGES: Record<string, string> = {
  wrong: "Current password is incorrect.",
  short: "New password must be at least 8 characters.",
  mismatch: "New password and confirmation do not match.",
};

export default function AdminAccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-8 px-6 py-16">
      <ToastOnLoad
        configs={[
          { param: "saved", type: "success", message: "Saved." },
          { param: "error", type: "error", message: ERROR_MESSAGES },
        ]}
      />
      <h1 className="text-2xl font-semibold text-foreground">Change password</h1>

      <form action={changePassword} className="flex flex-col gap-4">
        <Field label="Current password">
          <input
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </Field>
        <Field label="New password">
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
        <Field label="Confirm new password">
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
        <button type="submit" className={buttonClass}>
          Update password
        </button>
      </form>
    </main>
  );
}
