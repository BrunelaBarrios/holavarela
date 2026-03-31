'use client'

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AccessPageShell } from "../../components/AccessPageShell"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { supabase } from "../../supabase"

function getRegistroErrorState(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes("email rate limit exceeded") || normalizedMessage.includes("rate limit")) {
    return {
      tone: "notice" as const,
      message:
        "Ya se enviaron demasiados correos en poco tiempo. Espera unos minutos y, si ese email ya lo usaste antes, proba iniciar sesion o recuperar tu contrasena.",
    }
  }

  if (normalizedMessage.includes("user already registered")) {
    return {
      tone: "notice" as const,
      message: "Ese email ya esta registrado. Podes iniciar sesion o recuperar tu contrasena.",
    }
  }

  if (normalizedMessage.includes("invalid email")) {
    return {
      tone: "error" as const,
      message: "Ingresa un email valido para crear la cuenta.",
    }
  }

  return {
    tone: "error" as const,
    message: "No pudimos crear la cuenta en este momento. Proba de nuevo en unos minutos.",
  }
}

export default function SumateRegistroPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [errorTone, setErrorTone] = useState<"error" | "notice">("error")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setErrorTone("error")
    setSuccess("")

    if (password.length < 6) {
      setError("La contrasena tiene que tener al menos 6 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      setError("La confirmacion de contrasena no coincide.")
      return
    }

    setLoading(true)

    const redirectTo =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/sumate`

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (signUpError) {
      const nextErrorState = getRegistroErrorState(signUpError.message)
      setErrorTone(nextErrorState.tone)
      setError(nextErrorState.message)
      setLoading(false)
      return
    }

    if (data.session) {
      setSuccess("Tu cuenta quedo creada y ya podes completar el alta.")
      setLoading(false)
      window.setTimeout(() => {
        router.push("/sumate/alta")
      }, 900)
      return
    }

    setSuccess("Tu cuenta quedo creada. Si hace falta confirmar el email, hacelo desde el correo y despues inicia sesion.")
    setLoading(false)
    window.setTimeout(() => {
      router.push("/sumate/login")
    }, 1200)
  }

  return (
    <AccessPageShell
      eyebrow="Registro"
      title="Crea tu cuenta"
      description="Elegi tu propio email y contrasena. Tambien te pedimos confirmacion para evitar errores al registrarte."
      secondaryLink={{ href: "/sumate/login", label: "Ya tengo cuenta" }}
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

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Contrasena
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
            Confirmar contrasena
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

        {error ? <AuthFormStatus tone={errorTone} message={error} /> : null}
        {success ? <AuthFormStatus tone="success" message={success} /> : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <div className="text-sm text-slate-500">
          Si ya tenes acceso, podes{" "}
          <Link href="/sumate/login" className="font-semibold text-blue-600 hover:text-blue-700">
            iniciar sesion
          </Link>
          .
        </div>
      </form>
    </AccessPageShell>
  )
}
