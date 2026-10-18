import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Check for auth token in query params or cookies
  // Accept both the new `token` param and legacy `player_id` links
  const tokenFromQuery =
    request.nextUrl.searchParams.get("token") ??
    request.nextUrl.searchParams.get("player_id");
  const tokenFromCookie = request.cookies.get("auth_token")?.value;

  // If token in query param, set it as a cookie and redirect to same path without token
  if (tokenFromQuery) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("token"); // Remove token from URL to prevent redirect loop
    url.searchParams.delete("player_id"); // legacy param name
    const response = NextResponse.redirect(url);
    response.cookies.set("auth_token", tokenFromQuery, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
    return response;
  }

  const response = NextResponse.next({ request });

  // Everything requires authentication except the public paths below.
  // /admin/setup and /api/admin/users stay public so the first admin can be
  // created; /api/user returns `{ user: null }` for anonymous callers and is
  // used by client components to check auth state.
  const publicPaths = ["/login", "/admin/setup", "/api/admin/users", "/api/user"];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!isPublicPath && !tokenFromCookie) {
    // API requests get a 401; page requests get redirected to /login
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
