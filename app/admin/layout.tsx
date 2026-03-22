'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Activity,
  BadgeCheck,
  Building2,
  Calendar,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Radio,
  ShieldAlert,
  Store,
  X,
} from "lucide-react"
import {
  clearAdminSession,
  getAdminSession,
  type AdminRole,
} from "../lib/adminAuth"

const menuItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", roles: ["superadmin", "admin"] },
  { href: "/admin/comercios", icon: Store, label: "Comercios", roles: ["superadmin", "admin"] },
  { href: "/admin/eventos", icon: Calendar, label: "Eventos", roles: ["superadmin", "admin"] },
  { href: "/admin/servicios", icon: ShieldAlert, label: "Servicios", roles: ["superadmin", "admin"] },
  { href: "/admin/instituciones", icon: Building2, label: "Instituciones", roles: ["superadmin", "admin"] },
  { href: "/admin/cursos", icon: GraduationCap, label: "Cursos", roles: ["superadmin", "admin"] },
  { href: "/admin/sitio", icon: FileText, label: "Sitio", roles: ["superadmin"] },
  { href: "/admin/radio", icon: Radio, label: "Radio", roles: ["superadmin"] },
  { href: "/admin/administradores", icon: BadgeCheck, label: "Administradores", roles: ["superadmin"] },
  { href: "/admin/actividad", icon: Activity, label: "Actividad", roles: ["superadmin"] },
]

const superAdminOnlyPrefixes = ["/admin/sitio", "/admin/radio", "/admin/administradores", "/admin/actividad"]

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [adminRole, setAdminRole] = useState<AdminRole>("admin")
  const [adminName, setAdminName] = useState("")

  useEffect(() => {
    const isLoginPage = pathname === "/admin/loginV"
    const session = getAdminSession()
    const isLoggedIn = Boolean(session)

    if (!isLoggedIn && !isLoginPage) {
      router.replace("/admin/loginV")
      setIsCheckingAuth(false)
      return
    }

    if (isLoggedIn && isLoginPage) {
      router.replace("/admin")
      setIsCheckingAuth(false)
      return
    }

    if (session) {
      setAdminRole(session.role)
      setAdminName(session.name)
    }

    const isSuperAdminOnlyRoute = superAdminOnlyPrefixes.some((prefix) =>
      pathname.startsWith(prefix)
    )

    if (session?.role !== "superadmin" && isSuperAdminOnlyRoute) {
      router.replace("/admin")
      setIsCheckingAuth(false)
      return
    }

    setIsCheckingAuth(false)
  }, [pathname, router])

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-slate-600 shadow-sm">
          Cargando panel...
        </div>
      </div>
    )
  }

  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  if (pathname === "/admin/loginV") {
    return <>{children}</>
  }

  const visibleMenuItems = menuItems.filter((item) => item.roles.includes(adminRole))

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-3"
            onClick={() => setIsSidebarOpen(false)}
          >
            <img
              src="/logo-varela-chico.png"
              alt="Hola Varela"
              className="h-10 w-auto"
            />
            <div>
              <div className="font-semibold text-slate-900">Hola Varela!</div>
              <div className="text-xs text-slate-500">Administración</div>
            </div>
          </Link>

          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white transition-transform duration-300 lg:sticky lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <Link
              href="/admin"
              className="hidden items-center gap-3 border-b border-slate-200 p-6 lg:flex"
            >
              <img
                src="/logo-varela-chico.png"
                alt="Hola Varela"
                className="h-10 w-auto"
              />
              <div>
                <div className="font-semibold text-slate-900">Hola Varela!</div>
                <div className="text-xs text-slate-500">Administración</div>
              </div>
            </Link>

            <nav className="flex-1 space-y-2 p-4">
              {visibleMenuItems.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="space-y-2 border-t border-slate-200 p-4">
              {adminName && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="font-medium text-slate-900">{adminName}</div>
                  <div>
                    {adminRole === "superadmin" ? "Superadministrador" : "Administrador"}
                  </div>
                </div>
              )}

              <Link
                href="/"
                onClick={() => setIsSidebarOpen(false)}
                className="block rounded-xl px-4 py-3 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Ver sitio web
              </Link>

              <button
                onClick={() => {
                  setIsSidebarOpen(false)
                  clearAdminSession()
                  router.push("/admin/loginV")
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Salir del panel</span>
              </button>
            </div>
          </div>
        </aside>

        {isSidebarOpen && (
          <button
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Cerrar menu"
          />
        )}

        <main className="min-h-screen flex-1">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
