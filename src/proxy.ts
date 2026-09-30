import { NextResponse } from "next/server";
import { auth } from "@/auth";

const LOGIN_PATH = "/admin/login";

// Next.js 16 renamed the middleware.js convention to proxy.js — see node_modules/next/dist/docs.
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLoginPage = req.nextUrl.pathname === LOGIN_PATH;

  if (!isLoggedIn && !isOnLoginPage) {
    return NextResponse.redirect(new URL(LOGIN_PATH, req.nextUrl));
  }
  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }
});

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
