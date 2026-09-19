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

  // Protected routes - redirect to home if not authenticated
  // Note: /admin/users and /admin/setup are publicly accessible for setup
  const protectedPaths = ["/picks"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !tokenFromCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
