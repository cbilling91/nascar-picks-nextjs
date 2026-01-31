import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Check for auth token in query params or cookies
  const tokenFromQuery = request.nextUrl.searchParams.get("token");
  const tokenFromCookie = request.cookies.get("auth_token")?.value;

  // If token in query param, set it as a cookie and redirect
  if (tokenFromQuery) {
    const response = NextResponse.redirect(new URL("/", request.url));
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
  const protectedPaths = ["/picks", "/standings", "/live"];
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
