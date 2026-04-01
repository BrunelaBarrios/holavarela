'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { LogOut, Mail, UserRound } from "lucide-react"
import { supabase } from "../supabase"

export default function UsuariosHomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace("/usuarios/login")
        return
      }

      setUser(session.user)
      setLoading(false)
    }

    void loadSession()
  }, [router])

  const handleLogout = async () => {
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      setError("No pudimos cerrar la sesion.")
      return
    }

    router.push("/usuarios/login")
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        {loading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)]">
            Cargando cuenta...
          </div>
        ) : (
          <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
            <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-10 sm:px-10">
              <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Usuarios
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Sesion iniciada
              </h1>

              <p className="mt-4 text-lg leading-8 text-slate-600">
                Este acceso de usuarios ya esta listo. Si quieres, en el siguiente paso te armo su panel privado.
              </p>
            </div>

            <div className="px-6 py-8 sm:px-10">
              {error ? (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <UserRound className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Usuario
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-900">
                        {user?.email || "Sin email"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <Mail className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Estado
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-900">Autenticado</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Volver al inicio
                </Link>

                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesion
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
