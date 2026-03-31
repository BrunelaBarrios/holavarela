'use client'

import Link from "next/link"
import { useState } from "react"
import { AccessPageShell } from "../../components/AccessPageShell"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { supabase } from "../../supabase"

function getRecuperarErrorState(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes("email rate limit exceeded") || normalizedMessage.includes("rate limit")) {
    return {
      tone: "notice" as const,
      message: "Ya se enviaron demasiados correos en poco tiempo. Espera unos minutos y proba de nuevo.",
    }
  }

  if (normalizedMessage.includes("invalid email")) {
    return {
      tone: "error" as const,
      message: "Ingresa un email valido para recuperar la contrasena.",
    }
  }

  return {
    tone: "error" as const,
    message: "No pudimos enviar el correo de recuperacion. Proba de nuevo en unos minutos.",
  }
}

export default function SumateRecuperarPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [errorTone, setErrorTone] = useState<"error" | "notice">("error")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setErrorTone("error")
    setSuccess("")
    setLoading(true)

    const redirectTo =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/sumate/nueva-contrasena`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })

    if (resetError) {
      const nextErrorState = getRecuperarErrorState(resetError.message)
      setErrorTone(nextErrorState.tone)
      setError(nextErrorState.message)
      setLoading(false)
      return
    }

    setSuccess("Te enviamos un correo para restablecer tu contrasena.")
    setLoading(false)
  }

  return (
    <AccessPageShell
      eyebrow="Recuperar acceso"
      title="Recupera tu contrasena"
      description="Ingresa tu email y te enviamos un enlace para elegir una nueva contrasena."
      secondaryLink={{ href: "/sumate/login", label: "Volver al login" }}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
          />
        </div>

        {error ? <AuthFormStatus tone={errorTone} message={error} /> : null}
        {success ? <AuthFormStatus tone="success" message={success} /> : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
        >
          {loading ? "Enviando..." : "Enviar recuperacion"}
        </button>

        <Link href="/sumate/login" className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700">
          Volver a iniciar sesion
        </Link>
      </form>
    </AccessPageShell>
  )
}
