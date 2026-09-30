import { ProtectedImage } from "@/components/cloudinary-image";
import { getAbout } from "@/lib/queries";

export const revalidate = 60;

export default async function AboutPage() {
  const about = await getAbout();

  if (!about) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
        <h1 className="text-3xl font-semibold text-foreground">About</h1>
        <p className="text-muted">More about the artist coming soon.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        {about.photo ? (
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full bg-surface">
            <ProtectedImage
              src={about.photo.publicId}
              alt={about.photo.alt || "Swati Garg"}
              fill
              crop="fill"
              gravity="face"
              sizes="128px"
              className="object-cover"
            />
          </div>
        ) : null}
        <h1 className="text-3xl font-semibold text-foreground">About</h1>
      </header>

      {about.bio ? <p className="whitespace-pre-line text-muted">{about.bio}</p> : null}
      {about.statement ? (
        <blockquote className="border-l-2 border-accent pl-4 text-foreground">
          {about.statement}
        </blockquote>
      ) : null}

      <div className="flex flex-wrap gap-4 text-sm">
        {about.contactEmail ? (
          <a href={`mailto:${about.contactEmail}`} className="text-accent hover:underline">
            {about.contactEmail}
          </a>
        ) : null}
        {about.socials?.instagram ? (
          <a
            href={about.socials.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Instagram
          </a>
        ) : null}
        {about.resumeUrl ? (
          <a
            href={about.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Résumé
          </a>
        ) : null}
      </div>
    </main>
  );
}
