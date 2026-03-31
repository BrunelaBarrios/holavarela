'use client'

import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { AccessPageShell } from "../../components/AccessPageShell"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { supabase } from "../../supabase"

const initialForm = {
  nombre: "",
  telefono: "",
  nombreEspacio: "",
  mensaje: "",
}

export default function SumateAltaPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace("/sumate/login")
        return
      }

      const { data: existingRequest, error: existingRequestError } = await supabase
        .from("contacto_solicitudes")
        .select("id")
        .eq("email", session.user.email ?? "")
        .like("mensaje", "Solicitud de alta desde /sumate%")
        .order("created_at", { ascending: false })
        .limit(1)

      if (existingRequestError) {
        setError("No pudimos verificar si ya habias enviado tu solicitud.")
      }

      if (existingRequest?.length) {
        router.replace("/sumate")
        return
      }

      setUser(session.user)
      setLoadingSession(false)
    }

    void loadSession()
  }, [router])

  const handleChange =
    (field: keyof typeof initialForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!user?.email) {
      setError("Necesitas iniciar sesion para continuar con el alta.")
      return
    }

    setLoadingSubmit(true)

    const { data: existingRequest, error: existingRequestError } = await supabase
      .from("contacto_solicitudes")
      .select("id")
      .eq("email", user.email)
      .like("mensaje", "Solicitud de alta desde /sumate%")
      .order("created_at", { ascending: false })
      .limit(1)

    if (existingRequestError) {
      setError("No pudimos validar tu solicitud anterior. Proba de nuevo en unos minutos.")
      setLoadingSubmit(false)
      return
    }

    if (existingRequest?.length) {
      router.replace("/sumate")
      router.refresh()
      return
    }

    const detalles = [
      "Solicitud de alta desde /sumate",
      `Espacio o proyecto: ${form.nombreEspacio.trim()}`,
      form.mensaje.trim() ? `Detalle adicional: ${form.mensaje.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n")

    const payload = {
      nombre: form.nombre.trim(),
      email: user.email,
      telefono: form.telefono.trim(),
      mensaje: detalles,
    }

    const { error: insertError } = await supabase.from("contacto_solicitudes").insert([payload])

    if (insertError) {
      setError("No pudimos enviar tu solicitud ahora. Proba de nuevo en unos minutos.")
      setLoadingSubmit(false)
      return
    }

    router.push("/suscripcion-exitosa")
    router.refresh()
  }

  return (
    <AccessPageShell
      eyebrow="Alta"
      title="Completa tu solicitud"
      description="Usamos tu cuenta actual para identificar el acceso. Solo falta que nos compartas algunos datos para continuar con la publicacion y la suscripcion."
      secondaryLink={{ href: "/sumate", label: "Volver a acceso" }}
    >
      {loadingSession ? (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          Verificando sesion...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-5 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">Cuenta conectada</div>
            <div className="mt-2">{user?.email}</div>
          </div>

          <div className="space-y-2">
            <label htmlFor="nombre" className="text-sm font-medium text-slate-700">
              Tu nombre
            </label>
            <input
              id="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange("nombre")}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="telefono" className="text-sm font-medium text-slate-700">
              Telefono
            </label>
            <input
              id="telefono"
              type="tel"
              value={form.telefono}
              onChange={handleChange("telefono")}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="nombreEspacio" className="text-sm font-medium text-slate-700">
              Nombre de tu espacio, comercio o proyecto
            </label>
            <input
              id="nombreEspacio"
              type="text"
              value={form.nombreEspacio}
              onChange={handleChange("nombreEspacio")}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="mensaje" className="text-sm font-medium text-slate-700">
              Comentarios adicionales
            </label>
            <textarea
              id="mensaje"
              value={form.mensaje}
              onChange={handleChange("mensaje")}
              rows={5}
              placeholder="Contanos que queres publicar o cualquier dato que nos ayude a seguir."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            />
          </div>

          {error ? <AuthFormStatus tone="error" message={error} /> : null}

          <button
            type="submit"
            disabled={loadingSubmit}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
          >
            {loadingSubmit ? "Enviando solicitud..." : "Enviar solicitud"}
          </button>
        </form>
      )}
    </AccessPageShell>
  )
}
