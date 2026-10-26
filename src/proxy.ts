import { type NextRequest, NextResponse } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/planner",
  "/tasks",
  "/attendance",
  "/calendar",
  "/ai-study-planner",
  "/ai-document-analyzer",
  "/ai-quiz",
  "/flashcards",
  "/pomodoro",
  "/notes",
  "/budget",
  "/internship",
  "/resume",
  "/profile",
];

const authPaths = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuthPage = authPaths.includes(pathname);

  // Get token from cookie or header
  const token = request.cookies.get('accessToken')?.value || request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Token presence is the edge check. Full validation happens client-side via
  // AuthListener (which calls /auth/me on mount) and per-API-call 401s.
  // Avoiding a backend round-trip here keeps navigation fast.
  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\.).*)"],
};