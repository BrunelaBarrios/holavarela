'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AccessPageShell } from "../../components/AccessPageShell"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { supabase } from "../../supabase"

export default function SumateNuevaContrasenaPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setReady(Boolean(session))
    }

    void loadSession()

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true)
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (password.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      setError("La confirmación de contraseña no coincide.")
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError("No pudimos actualizar la contraseña.")
      setLoading(false)
      return
    }

    setSuccess("Tu contraseña quedó actualizada. Ya podés iniciar sesión.")
    setLoading(false)
    window.setTimeout(() => {
      router.push("/sumate/login")
    }, 1400)
  }

  return (
    <AccessPageShell
      eyebrow="Nueva contraseña"
      title="Elegí una contraseña nueva"
      description="Usá el enlace del correo de recuperación para llegar hasta acá y cambiar tu clave."
      secondaryLink={{ href: "/sumate/login", label: "Ir al login" }}
    >
      {!ready ? (
        <div className="space-y-5">
          <AuthFormStatus
            tone="error"
            message="Abrí esta pantalla desde el enlace que te llegó por correo para poder cambiar la contraseña."
          />

          <Link href="/sumate/recuperar" className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700">
            Volver a pedir recuperación
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Nueva contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
            />
          </div>

          {error ? <AuthFormStatus tone="error" message={error} /> : null}
          {success ? <AuthFormStatus tone="success" message={success} /> : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
          >
            {loading ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>
      )}
    </AccessPageShell>
  )
}
