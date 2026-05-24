'use client'

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ExternalLink, LogOut, Menu, Search, X } from "lucide-react"
import {
  adminNavigationGroups,
  getVisibleAdminNavigation,
  isActiveAdminRoute,
} from "./adminNavigation"
import {
  clearAdminSession,
  getAdminSession,
  saveAdminSession,
  type AdminRole,
} from "../lib/adminAuth"
import { canAccessAdminPath } from "../lib/adminPermissions"

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [session, setSession] = useState(() => getAdminSession())
  const [navSearch, setNavSearch] = useState("")
  const adminRole: AdminRole = session?.role || "admin"
  const adminName = session?.name || ""
  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/loginV"
  const isLoggedIn = Boolean(session)
  const shouldRedirectToLogin = !isCheckingSession && !isLoggedIn && !isLoginPage
  const shouldRedirectToDashboard = !isCheckingSession && isLoggedIn && isLoginPage
  const shouldRedirectByRole =
    !isCheckingSession && !canAccessAdminPath(pathname, session?.role)

  const visibleMenuItems = useMemo(
    () => getVisibleAdminNavigation(adminRole),
    [adminRole]
  )

  const filteredMenuItems = useMemo(() => {
    const term = navSearch.trim().toLowerCase()
    if (!term) return visibleMenuItems

    return visibleMenuItems.filter((item) => {
      const searchable = [
        item.label,
        item.description,
        ...item.keywords,
      ].join(" ").toLowerCase()

      return searchable.includes(term)
    })
  }, [navSearch, visibleMenuItems])

  const groupedMenuItems = adminNavigationGroups
    .map((group) => ({
      ...group,
      items: filteredMenuItems.filter((item) => item.group === group.id),
    }))
    .filter((group) => group.items.length > 0)

  useEffect(() => {
    let mounted = true

    const syncSession = async () => {
      try {
        const response = await fetch("/api/admin/session", {
          cache: "no-store",
        })
        const result = (await response.json()) as {
          session?: { username: string; name: string; role: AdminRole } | null
        }

        if (!mounted) return

        if (result.session) {
          saveAdminSession(result.session)
          setSession(result.session)
        } else {
          clearAdminSession()
          setSession(null)
        }
      } catch {
        if (!mounted) return
        clearAdminSession()
        setSession(null)
      } finally {
        if (mounted) {
          setIsCheckingSession(false)
        }
      }
    }

    void syncSession()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace("/admin/login")
      return
    }

    if (shouldRedirectToDashboard) {
      router.replace("/admin")
      return
    }

    if (shouldRedirectByRole) {
      router.replace("/admin")
    }
  }, [router, shouldRedirectByRole, shouldRedirectToDashboard, shouldRedirectToLogin])

  if (
    isCheckingSession ||
    shouldRedirectToLogin ||
    shouldRedirectToDashboard ||
    shouldRedirectByRole
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
          Cargando panel...
        </div>
      </div>
    )
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-3"
            onClick={() => setIsSidebarOpen(false)}
          >
            <Image
              src="/logo-varela-chico.png"
              alt="Hola Varela"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
            <div>
              <div className="font-semibold text-slate-950">Hola Varela!</div>
              <div className="text-xs text-slate-500">Administración</div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            aria-label={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
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
              className="hidden items-center gap-3 border-b border-slate-200 p-5 lg:flex"
            >
              <Image
                src="/logo-varela-chico.png"
                alt="Hola Varela"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
              <div>
                <div className="font-semibold text-slate-950">Hola Varela!</div>
                <div className="text-xs text-slate-500">Administración</div>
              </div>
            </Link>

            <div className="border-b border-slate-200 p-4">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus-within:border-blue-300 focus-within:bg-white">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={navSearch}
                  onChange={(event) => setNavSearch(event.target.value)}
                  placeholder="Buscar sección"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <nav className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                {groupedMenuItems.map((group) => (
                  <div key={group.id}>
                    <p className="mb-2 px-3 text-xs font-semibold uppercase text-slate-400">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const isActive = isActiveAdminRoute(pathname, item.href)
                        const Icon = item.icon

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsSidebarOpen(false)}
                            className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition ${
                              isActive
                                ? "bg-slate-950 text-white"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                            }`}
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                              <span className="block text-sm font-medium">{item.label}</span>
                              <span
                                className={`mt-0.5 block text-xs leading-5 ${
                                  isActive ? "text-slate-200" : "text-slate-400"
                                }`}
                              >
                                {item.description}
                              </span>
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>

            <div className="space-y-2 border-t border-slate-200 p-4">
              {adminName ? (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="font-medium text-slate-950">{adminName}</div>
                  <div>
                    {adminRole === "superadmin" ? "Superadministrador" : "Administrador"}
                  </div>
                </div>
              ) : null}

              <Link
                href="/"
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              >
                <ExternalLink className="h-4 w-4" />
                Ver sitio web
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsSidebarOpen(false)
                  clearAdminSession()
                  void fetch("/api/admin/session", {
                    method: "DELETE",
                  })
                  router.push("/admin/login")
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Salir del panel
              </button>
            </div>
          </div>
        </aside>

        {isSidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Cerrar menú"
          />
        ) : null}

        <main className="min-h-screen flex-1">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
