import { NextResponse, type NextRequest } from "next/server"
import {
  attachAdminSessionCookie,
  readAdminSessionFromRequest,
} from "./app/lib/adminSession"
import { canAccessAdminPath } from "./app/lib/adminPermissions"

const ADMIN_LOGIN_PATH = "/admin/login"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminPage = pathname.startsWith("/admin")
  const isAdminApi = pathname.startsWith("/api/admin")
  const isLoginRoute = pathname === ADMIN_LOGIN_PATH || pathname === "/admin/loginV"
  const isSessionApi = pathname === "/api/admin/session"

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next()
  }

  const session = await readAdminSessionFromRequest(request)

  if (isAdminApi && !isSessionApi && !session) {
    return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
  }

  if (isAdminPage && !isLoginRoute && !session) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = ADMIN_LOGIN_PATH
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAdminPage && isLoginRoute && session) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = "/admin"
    dashboardUrl.search = ""
    return NextResponse.redirect(dashboardUrl)
  }

  if (isAdminPage && session && !canAccessAdminPath(pathname, session.role)) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = "/admin"
    dashboardUrl.search = ""
    return NextResponse.redirect(dashboardUrl)
  }

  const response = NextResponse.next()

  // Keep the admin session alive while the user is actively working.
  // Without this rolling renewal, an already-open panel remains visible after
  // the cookie expires and the next save unexpectedly fails with a 401.
  if (session) {
    return await attachAdminSessionCookie(response, session)
  }

  return response
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
