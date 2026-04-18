import { NextResponse, type NextRequest } from "next/server"
import { readAdminSessionFromRequest } from "./app/lib/adminSession"

const ADMIN_LOGIN_PATH = "/admin/login"

export async function proxy(request: NextRequest) {
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

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
