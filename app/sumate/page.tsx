'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { AccessPageShell } from "../components/AccessPageShell"
import { AuthFormStatus } from "../components/AuthFormStatus"
import { supabase } from "../supabase"

export default function SumatePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("")

  useEffect(() => {
    const syncRegisteredUser = async (currentUser: User | null) => {
      if (!currentUser?.id || !currentUser.email) return

      const { error } = await supabase
        .from("usuarios_registrados")
        .upsert(
          {
            user_id: currentUser.id,
            email: currentUser.email,
          },
          { onConflict: "email" }
        )

      if (error) {
        console.error("No se pudo sincronizar el usuario registrado:", error)
      }
    }

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setUser(session?.user ?? null)
      void syncRegisteredUser(session?.user ?? null)
      setLoading(false)
    }

    void loadSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      void syncRegisteredUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setStatus("No pudimos cerrar la sesión. Probá de nuevo.")
      return
    }

    setStatus("")
    setUser(null)
  }

  return (
    <AccessPageShell
      eyebrow="Acceso privado"
      title="Sumate a Hola Varela"
      description="Esta entrada no aparece en la home. Desde acá vas a poder registrarte con tu email, iniciar sesión y después continuar con el alta de tu espacio."
      secondaryLink={
        user
          ? undefined
          : {
              href: "/sumate/registro",
              label: "Crear cuenta",
            }
      }
    >
      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          Cargando acceso...
        </div>
      ) : user ? (
        <div className="space-y-6">
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-8">
            <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Sesión activa
            </div>

            <h2 className="mt-5 text-3xl font-semibold text-slate-900">
              Ya ingresaste con tu cuenta
            </h2>

            <p className="mt-3 text-base leading-7 text-slate-600">
              Email: <span className="font-medium text-slate-900">{user.email}</span>
            </p>

            <p className="mt-5 text-base leading-7 text-slate-600">
              El siguiente paso es conectar este acceso con el formulario de alta y la suscripción. La base ya está pronta para seguir con eso.
            </p>
          </div>

          {status ? <AuthFormStatus tone="error" message={status} /> : null}

          <div className="flex flex-wrap gap-4">
            <Link
              href="/sumate/recuperar"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Recuperar contraseña
            </Link>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8">
            <h2 className="text-3xl font-semibold text-slate-900">
              Elegí cómo querés entrar
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Si es tu primera vez, creá una cuenta con tu email y una contraseña. Si ya tenés acceso, iniciá sesión.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/sumate/registro"
              className="rounded-[24px] border border-slate-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-sm"
            >
              <div className="text-lg font-semibold text-slate-900">Crear cuenta</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Registrate con email, contraseña y confirmación de contraseña.
              </p>
            </Link>

            <Link
              href="/sumate/login"
              className="rounded-[24px] border border-slate-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-sm"
            >
              <div className="text-lg font-semibold text-slate-900">Iniciar sesión</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Entrá con tu cuenta para seguir con el proceso.
              </p>
            </Link>
          </div>

          <Link
            href="/sumate/recuperar"
            className="inline-flex items-center text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          >
            Olvidé mi contraseña
          </Link>
        </div>
      )}
    </AccessPageShell>
  )
}
