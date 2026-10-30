import { Trash2 } from "lucide-react";
import { getAllMessages } from "@/lib/admin-queries";
import { markMessageRead, deleteMessage } from "./actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ActionIcon, buttonClass, cardClass } from "@/components/admin/ui";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function AdminMessagesPage() {
  const messages = await getAllMessages();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">Messages</h1>

      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <div key={String(message._id)} className={`${cardClass} flex flex-col gap-2`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-foreground">
                  {message.name} <span className="text-muted">&lt;{message.email}&gt;</span>
                </p>
                <p className="text-xs text-muted">
                  {dateFormatter.format(new Date(message.createdAt))}
                  {!message.readAt ? " · unread" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {!message.readAt ? (
                  <form action={markMessageRead}>
                    <input type="hidden" name="id" value={String(message._id)} />
                    <button type="submit" className={buttonClass}>
                      Mark read
                    </button>
                  </form>
                ) : null}
                <form action={deleteMessage}>
                  <input type="hidden" name="id" value={String(message._id)} />
                  <ConfirmButton
                    confirmText="Delete this message?"
                    aria-label="Delete message"
                  >
                    <ActionIcon icon={Trash2} variant="danger" />
                  </ConfirmButton>
                </form>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground">{message.message}</p>
          </div>
        ))}
        {messages.length === 0 ? <p className="text-muted">No messages yet.</p> : null}
      </div>
    </main>
  );
}
