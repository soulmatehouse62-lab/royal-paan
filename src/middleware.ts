import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAMES } from "@/lib/auth/cookie";

// The print agent has no session; these routes check its x-agent-key themselves.
const PRINT_AGENT_ROUTE = /^\/api\/print-jobs\/(next|[a-f0-9]{24}\/done)\/?$/i;

// Middleware only sends visitors without a session cookie to /login. The real
// check (requireUser) runs in every page, server action and API route.
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/login" || pathname === "/m" || pathname.startsWith("/m/")) return NextResponse.next();
  if (PRINT_AGENT_ROUTE.test(pathname)) return NextResponse.next();

  if (!SESSION_COOKIE_NAMES.some((n) => req.cookies.has(n))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Let requireUser() build a ?next= link when a session has expired.
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname + search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except static files and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|logo.png|robots.txt).*)"],
};
