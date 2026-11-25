import type { Metadata } from "next";
import { TextLink } from "@/components/text-link/text-link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Copyright and licensing — Swati Garg",
  description: "Copyright, permitted use and licence requests for the artworks and images on this site.",
  path: "/copyright",
});

export default function CopyrightPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16 text-foreground">
      <h1 className="text-3xl font-medium">Copyright and licensing</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Copyright</h2>
        <p className="text-muted">
          Every artwork, photograph of an artwork and other image on this site is protected by copyright. Swati
          Garg holds the copyright in these works unless a page states otherwise. The text on this site is also
          protected by copyright.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Permitted use</h2>
        <p className="text-muted">
          You are welcome to share a link to any page on this site. You may quote short passages of text if you
          credit Swati Garg and link to the page. Do not download, copy, print, reproduce, edit or adapt any image
          without written permission.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Licensing</h2>
        <p className="text-muted">
          To use an artwork or image for publication, exhibition, merchandise, advertising, editorial work or any
          other commercial purpose, request a licence before use. Include the artwork title, how and where you plan
          to use it, the duration and the territory. Licences are granted in writing and may carry a fee.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Buying an artwork</h2>
        <p className="text-muted">
          Buying an original artwork transfers ownership of the physical piece only. Copyright remains with the
          artist unless a written agreement says otherwise. Reproduction rights are not included in a sale.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Reporting use without permission</h2>
        <p className="text-muted">
          If you find an image of an artwork used without permission, or believe this site infringes your rights,
          send the artist the link and details of the use through the contact page.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">Questions</h2>
        <p className="text-muted">
          To request a licence or ask about image use, use the{" "}
          <TextLink href="/contact" variant="primary" className="text-accent">
            contact page
          </TextLink>
          .
        </p>
      </section>
    </main>
  );
}
