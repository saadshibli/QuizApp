import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  // 1. If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // 2. Decode JWT payload (middleware is client-side gating only — server verifies signature)
    const payloadParts = token.split(".");
    if (payloadParts.length !== 3) {
      throw new Error("Invalid token");
    }

    const payloadBase64 = payloadParts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(atob(payloadBase64));

    const { role, exp } = decodedPayload;

    // 3. Check token expiration
    if (exp && Date.now() >= exp * 1000) {
      const response = NextResponse.redirect(new URL("/login", req.url));
      response.cookies.set("token", "", { maxAge: 0, path: "/" });
      return response;
    }

    // 4. Validate role is a known value
    if (!["admin", "teacher", "student"].includes(role)) {
      throw new Error("Invalid role");
    }

    // 5. Enforce Role Protection
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (
      pathname.startsWith("/teacher") &&
      role !== "teacher" &&
      role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (
      pathname.startsWith("/student") &&
      role !== "student" &&
      role !== "teacher" &&
      role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (
      (pathname.startsWith("/create-quiz") ||
        pathname.startsWith("/session")) &&
      role !== "teacher" &&
      role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // /join-quiz, /quiz-player, /profile — any authenticated user
    if (
      (pathname.startsWith("/join-quiz") ||
        pathname.startsWith("/quiz-player") ||
        pathname.startsWith("/profile")) &&
      !role
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  } catch {
    // If token manipulation fails or malformed — clear cookie and redirect
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.set("token", "", { maxAge: 0, path: "/" });
    return response;
  }

  return NextResponse.next();
}

// Define the routes this middleware operates on
export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/create-quiz/:path*",
    "/session/:path*",
    "/join-quiz/:path*",
    "/quiz-player/:path*",
    "/profile/:path*",
  ],
};
