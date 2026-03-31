'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { AccessPageShell } from "../components/AccessPageShell"
import { AuthFormStatus } from "../components/AuthFormStatus"
import { supabase } from "../supabase"

export default function SumatePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("")
  const [existingRequestDate, setExistingRequestDate] = useState<string | null>(null)
  const [checkedExistingRequest, setCheckedExistingRequest] = useState(false)

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

    const loadExistingRequest = async (currentUser: User | null) => {
      if (!currentUser?.email) {
        setExistingRequestDate(null)
        setCheckedExistingRequest(true)
        return
      }

      const { data, error } = await supabase
        .from("contacto_solicitudes")
        .select("created_at")
        .eq("email", currentUser.email)
        .like("mensaje", "Solicitud de alta desde /sumate%")
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) {
        console.error("No se pudo verificar la solicitud de alta:", error)
        setExistingRequestDate(null)
        setCheckedExistingRequest(true)
        return
      }

      setExistingRequestDate(data?.[0]?.created_at ?? null)
      setCheckedExistingRequest(true)
    }

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setUser(session?.user ?? null)
      void syncRegisteredUser(session?.user ?? null)
      void loadExistingRequest(session?.user ?? null)
      setLoading(false)
    }

    void loadSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      void syncRegisteredUser(session?.user ?? null)
      void loadExistingRequest(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading || !checkedExistingRequest || !user) return
    if (existingRequestDate) return

    router.replace("/sumate/alta")
  }, [checkedExistingRequest, existingRequestDate, loading, router, user])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setStatus("No pudimos cerrar la sesion. Proba de nuevo.")
      return
    }

    setStatus("")
    setUser(null)
  }

  return (
    <AccessPageShell
      eyebrow="Acceso privado"
      title="Sumate a Hola Varela"
      description="Esta entrada no aparece en la home. Desde aca vas a poder registrarte con tu email, iniciar sesion y despues continuar con el alta de tu espacio."
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
              {existingRequestDate ? "Solicitud recibida" : "Sesion activa"}
            </div>

            <h2 className="mt-5 text-3xl font-semibold text-slate-900">
              Ya ingresaste con tu cuenta
            </h2>

            <p className="mt-3 text-base leading-7 text-slate-600">
              Email: <span className="font-medium text-slate-900">{user.email}</span>
            </p>

            <p className="mt-5 text-base leading-7 text-slate-600">
              {existingRequestDate
                ? "Ya recibimos la solicitud de alta vinculada a esta cuenta. Vamos a continuar el seguimiento desde admin sin que tengas que volver a enviarla."
                : "Ya podes seguir con el alta de tu espacio. Completa el formulario y vamos a recibir tu solicitud con esta misma cuenta."}
            </p>

            {existingRequestDate ? (
              <p className="mt-4 text-sm text-slate-500">
                Enviada el{" "}
                <span className="font-medium text-slate-700">
                  {new Date(existingRequestDate).toLocaleString("es-UY")}
                </span>
                .
              </p>
            ) : null}
          </div>

          {status ? <AuthFormStatus tone="error" message={status} /> : null}

          <div className="flex flex-wrap gap-4">
            {existingRequestDate ? (
              <Link
                href="/sumate/panel"
                className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Ir a mi panel
              </Link>
            ) : (
              <Link
                href="/sumate/alta"
                className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                Continuar con el alta
              </Link>
            )}

            <Link
              href="/sumate/recuperar"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Recuperar contrasena
            </Link>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8">
            <h2 className="text-3xl font-semibold text-slate-900">
              Elegi como queres entrar
            </h2>

            <p className="mt-4 text-base leading-7 text-slate-600">
              Si es tu primera vez, crea una cuenta con tu email y una contrasena. Si ya tenes acceso, inicia sesion.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/sumate/registro"
              className="rounded-[24px] border border-slate-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-sm"
            >
              <div className="text-lg font-semibold text-slate-900">Crear cuenta</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Registrate con email, contrasena y confirmacion de contrasena.
              </p>
            </Link>

            <Link
              href="/sumate/login"
              className="rounded-[24px] border border-slate-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-sm"
            >
              <div className="text-lg font-semibold text-slate-900">Iniciar sesion</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Entra con tu cuenta para seguir con el proceso.
              </p>
            </Link>
          </div>

          <Link
            href="/sumate/recuperar"
            className="inline-flex items-center text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          >
            Olvide mi contrasena
          </Link>
        </div>
      )}
    </AccessPageShell>
  )
}
