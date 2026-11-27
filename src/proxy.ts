import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { homepageLinkHeader } from "@/lib/api-catalog";
import { prefersMarkdown } from "@/lib/markdown";
import { resolveSlugRoute } from "@/lib/slug-routing";

const LOGIN_PATH = "/admin/login";
// No route has this path, so the rewrite gets Next's own 404 page and status, and the URL stays as requested.
const NOT_FOUND_PATH = "/not-found";

// Next.js 16 renamed the middleware.js convention to proxy.js — see node_modules/next/dist/docs.
// Only admin routes run the auth wrapper. It sets session cookies, so public pages stay cookie-free.
// NextAuth types its wrapper for route handlers too. At runtime it takes (request, event), the same as proxy.
const authorizeAdmin = auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLoginPage = req.nextUrl.pathname === LOGIN_PATH;

  if (!isLoggedIn && !isOnLoginPage) {
    return NextResponse.redirect(new URL(LOGIN_PATH, req.nextUrl));
  }
  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }
}) as unknown as (req: NextRequest, event: NextFetchEvent) => Response | undefined | Promise<Response | undefined>;

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  if (req.nextUrl.pathname.startsWith("/admin")) return authorizeAdmin(req, event);
  return publicRequest(req);
}

async function publicRequest(req: NextRequest) {
  const target = await resolveSlugRoute(req.nextUrl.pathname);
  if (target?.kind === "moved") {
    const url = new URL(target.location, req.nextUrl);
    if (!url.search) url.search = req.nextUrl.search;
    return NextResponse.redirect(url, target.status);
  }
  if (target?.kind === "gone") return NextResponse.rewrite(new URL(NOT_FOUND_PATH, req.nextUrl));
  return negotiateMarkdown(req);
}

// Agents that send `Accept: text/markdown` get the markdown route at the same URL. Everything else gets HTML.
// The homepage HTML also advertises the API catalog and other machine-readable resources through Link headers.
function negotiateMarkdown(req: NextRequest) {
  if (prefersMarkdown(req.headers.get("accept"))) {
    const url = req.nextUrl.clone();
    const pathname = req.nextUrl.pathname;
    url.pathname = pathname === "/" ? "/api/markdown" : `/api/markdown${pathname}`;
    url.search = "";
    return NextResponse.rewrite(url);
  }
  const response = NextResponse.next();
  if (req.nextUrl.pathname === "/") response.headers.set("Link", homepageLinkHeader());
  return response;
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/",
    "/about",
    "/faq",
    "/portfolio",
    "/portfolio/:path*",
    "/series",
    "/exhibitions",
    "/exhibitions/:path*",
    "/artwork/:path*",
  ],
};
