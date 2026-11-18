import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prefersMarkdown } from "@/lib/markdown";

const LOGIN_PATH = "/admin/login";

// Next.js 16 renamed the middleware.js convention to proxy.js — see node_modules/next/dist/docs.
export default auth((req) => {
  if (!req.nextUrl.pathname.startsWith("/admin")) return negotiateMarkdown(req);

  const isLoggedIn = !!req.auth;
  const isOnLoginPage = req.nextUrl.pathname === LOGIN_PATH;

  if (!isLoggedIn && !isOnLoginPage) {
    return NextResponse.redirect(new URL(LOGIN_PATH, req.nextUrl));
  }
  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }
});

// Agents that send `Accept: text/markdown` get the markdown route at the same URL. Everything else gets HTML.
function negotiateMarkdown(req: NextRequest) {
  if (prefersMarkdown(req.headers.get("accept"))) {
    const url = req.nextUrl.clone();
    const pathname = req.nextUrl.pathname;
    url.pathname = pathname === "/" ? "/api/markdown" : `/api/markdown${pathname}`;
    url.search = "";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
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
