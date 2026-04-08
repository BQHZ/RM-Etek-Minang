import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, getRoleRedirect } from "@/lib/auth"

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/users"]

const ROLE_ACCESS: Record<string, string[]> = {
  "/pos": ["WAITER", "KASIR"],
  "/kitchen": ["DAPUR"],
  "/dashboard": ["OWNER"],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  const session = await getSessionFromRequest(request)

  // No session → redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Root path → redirect to role-based page
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(getRoleRedirect(session.role), request.url)
    )
  }

  // Check role-based access
  for (const [path, roles] of Object.entries(ROLE_ACCESS)) {
    if (pathname.startsWith(path)) {
      if (!roles.includes(session.role)) {
        return NextResponse.redirect(
          new URL(getRoleRedirect(session.role), request.url)
        )
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
