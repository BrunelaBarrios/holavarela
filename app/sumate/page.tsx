'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import {
  ArrowRight,
  BadgeCheck,
  DoorOpen,
  KeyRound,
  MailCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthFormStatus } from "../components/AuthFormStatus"
import { supabase } from "../supabase"

function formatRequestDate(value: string | null) {
  if (!value) return ""
  return new Date(value).toLocaleString("es-UY")
}

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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {loading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)]">
            Cargando acceso...
          </div>
        ) : user ? (
          <div className="space-y-6">
            {status ? <AuthFormStatus tone="error" message={status} /> : null}

            <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
              <div className="grid lg:grid-cols-[1.25fr_0.85fr]">
                <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
                  <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    Acceso privado
                  </div>

                  <div className="mt-6 max-w-2xl">
                    <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                      Ya ingresaste con tu cuenta
                    </h1>
                    <p className="mt-4 text-lg leading-8 text-slate-600">
                      {existingRequestDate
                        ? "Tu cuenta ya quedo conectada con una solicitud de alta. Desde aqui puedes entrar al panel y seguir gestionando tu espacio."
                        : "Tu cuenta ya esta lista. El siguiente paso es completar el alta para vincular tu perfil con Hola Varela."}
                    </p>
                    <p className="mt-5 text-sm text-slate-500">{user.email}</p>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Cuenta
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xl font-semibold text-slate-950">
                        <MailCheck className="h-5 w-5 text-emerald-600" />
                        Activa
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Tu email ya esta autenticado para seguir usando el panel.
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Estado
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xl font-semibold text-slate-950">
                        {existingRequestDate ? (
                          <>
                            <BadgeCheck className="h-5 w-5 text-emerald-600" />
                            Solicitud enviada
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-5 w-5 text-blue-600" />
                            Falta alta
                          </>
                        )}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {existingRequestDate
                          ? `Enviada el ${formatRequestDate(existingRequestDate)}.`
                          : "Todavia falta completar el formulario para vincular tu perfil."}
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Siguiente paso
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xl font-semibold text-slate-950">
                        <ShieldCheck className="h-5 w-5 text-sky-600" />
                        {existingRequestDate ? "Entrar al panel" : "Completar alta"}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {existingRequestDate
                          ? "Puedes seguir gestionando perfil, eventos y estado desde tu espacio privado."
                          : "Completa tus datos para que admin pueda aceptar y publicar tu espacio."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-8 sm:px-8 sm:py-10">
                  <div>
                    <div
                      className={`rounded-[28px] border p-6 ${
                        existingRequestDate
                          ? "border-emerald-200 bg-emerald-50/70"
                          : "border-blue-200 bg-blue-50/70"
                      }`}
                    >
                      <div
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                          existingRequestDate
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {existingRequestDate ? "Solicitud recibida" : "Alta pendiente"}
                      </div>

                      <h2 className="mt-5 text-2xl font-semibold text-slate-900">
                        {existingRequestDate ? "Todo listo para seguir" : "Te falta un paso"}
                      </h2>

                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        {existingRequestDate
                          ? "Tu cuenta ya tiene una solicitud asociada. Si el registro fue aceptado, puedes entrar al panel; si no, admin puede aprobarlo desde contactos."
                          : "Completa el alta para elegir el tipo de perfil, buscar si ya existe o cargar los datos desde cero."}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {existingRequestDate ? (
                        <Link
                          href="/sumate/panel"
                          className="group flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 transition hover:border-blue-300 hover:bg-blue-50/60"
                        >
                          <div>
                            <div className="text-base font-semibold text-slate-900">Ir a mi panel</div>
                            <div className="mt-1 text-sm text-slate-500">Entra a tu espacio privado para editar perfil y eventos.</div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:text-blue-600" />
                        </Link>
                      ) : (
                        <Link
                          href="/sumate/alta"
                          className="group flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 transition hover:border-blue-300 hover:bg-blue-50/60"
                        >
                          <div>
                            <div className="text-base font-semibold text-slate-900">Continuar con el alta</div>
                            <div className="mt-1 text-sm text-slate-500">Vincula tu cuenta con tu comercio, servicio, curso o institucion.</div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:text-blue-600" />
                        </Link>
                      )}

                      <Link
                        href="/sumate/recuperar"
                        className="group flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div>
                          <div className="text-base font-semibold text-slate-900">Recuperar contrasena</div>
                          <div className="mt-1 text-sm text-slate-500">Cambia tu clave sin pasar por admin.</div>
                        </div>
                        <KeyRound className="h-5 w-5 text-slate-400 transition group-hover:text-slate-700" />
                      </Link>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    <DoorOpen className="h-4 w-4" />
                    Cerrar sesion
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
              <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
                <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Acceso privado
                </div>

                <div className="mt-6 max-w-2xl">
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                    Sumate a Hola Varela
                  </h1>
                  <p className="mt-4 text-lg leading-8 text-slate-600">
                    Crea tu cuenta o inicia sesion para gestionar tu perfil, completar el alta y despues usar tu propio panel privado.
                  </p>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Paso 1
                    </div>
                    <div className="mt-3 text-xl font-semibold text-slate-950">Crea tu cuenta</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Usa tu email y una contrasena propia para entrar cuando quieras.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Paso 2
                    </div>
                    <div className="mt-3 text-xl font-semibold text-slate-950">Completa el alta</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Elige el tipo de perfil y cargalo o vinculalo si ya existe.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Paso 3
                    </div>
                    <div className="mt-3 text-xl font-semibold text-slate-950">Usa tu panel</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Edita tu perfil, suma eventos y sigue el estado de tu espacio.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-8 sm:px-8 sm:py-10">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Elegi como entrar
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-slate-950">Tu acceso empieza aca</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Si es tu primera vez, crea tu cuenta. Si ya te registraste antes, solo entra con tu email.
                  </p>

                  <div className="mt-6 grid gap-3">
                    <Link
                      href="/sumate/registro"
                      className="group flex items-center justify-between rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f3f9ff_100%)] px-5 py-4 transition hover:border-blue-300 hover:bg-blue-50/60"
                    >
                      <div>
                        <div className="text-base font-semibold text-slate-900">Crear cuenta</div>
                        <div className="mt-1 text-sm text-slate-500">
                          Registrate con email, contrasena y confirmacion.
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:text-blue-600" />
                    </Link>

                    <Link
                      href="/sumate/login"
                      className="group flex items-center justify-between rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f4faf6_100%)] px-5 py-4 transition hover:border-emerald-300 hover:bg-emerald-50/60"
                    >
                      <div>
                        <div className="text-base font-semibold text-slate-900">Iniciar sesion</div>
                        <div className="mt-1 text-sm text-slate-500">
                          Entra con tu cuenta para seguir con el proceso.
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:text-emerald-600" />
                    </Link>
                  </div>

                  <Link
                    href="/sumate/recuperar"
                    className="mt-5 inline-flex items-center text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                  >
                    Olvide mi contrasena
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
