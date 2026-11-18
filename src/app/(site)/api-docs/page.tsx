import type { Metadata } from "next";
import { TextLink } from "@/components/text-link/text-link";
import { CopyButton } from "@/components/copy-button";
import { OPENAPI_MEDIA_TYPE, OPENAPI_PATH, OPENAPI_PATHS, API_CATALOG_PATH } from "@/lib/api-catalog";
import { absoluteUrl, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "API — Swati Garg",
  description: "Read-only JSON API for published works, with an OpenAPI description.",
  path: "/api-docs",
});

export default function ApiDocsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16 text-foreground">
      <h1 className="text-3xl font-medium">API</h1>

      <section className="flex flex-col gap-3">
        <p className="text-muted">
          Public, read-only JSON endpoints for published works. Every request uses GET and needs no key.
          Unpublished works are never returned.
        </p>
        <p className="text-muted">
          The machine-readable description is the{" "}
          <TextLink href={OPENAPI_PATH} variant="primary" className="text-accent">
            OpenAPI document
          </TextLink>{" "}
          ({OPENAPI_MEDIA_TYPE}). Automated clients can find it through the{" "}
          <TextLink href={API_CATALOG_PATH} variant="primary" className="text-accent">
            API catalog
          </TextLink>
          .
        </p>
      </section>

      {Object.entries(OPENAPI_PATHS).map(([path, { get: operation }]) => {
        // Appended as text, not through new URL(), which would percent-encode the {slug} placeholder.
        const url = `${absoluteUrl("/api")}${path}`;
        return (
          <section key={path} className="flex flex-col gap-3">
            <h2 className="text-xl font-medium">{operation.summary}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 break-all">
                <code>GET {url}</code>
              </p>
              <CopyButton text={url} label={`Copy URL for: ${operation.summary}`} />
            </div>
            {operation.parameters && operation.parameters.length > 0 && (
              <dl className="flex flex-col gap-2 text-muted">
                {operation.parameters.map((parameter) => (
                  <div key={parameter.name}>
                    <dt>
                      <code>{parameter.name}</code>
                    </dt>
                    <dd>{parameter.description}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        );
      })}
    </main>
  );
}
