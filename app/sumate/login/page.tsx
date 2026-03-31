'use client'

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AccessPageShell } from "../../components/AccessPageShell"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { supabase } from "../../supabase"

export default function SumateLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError("No pudimos iniciar sesión. Revisá el email y la contraseña.")
      setLoading(false)
      return
    }

    router.push("/sumate")
    router.refresh()
  }

  return (
    <AccessPageShell
      eyebrow="Ingreso"
      title="Iniciá sesión"
      description="Entrá con el email y la contraseña que elegiste para seguir con tu alta en Hola Varela."
      secondaryLink={{ href: "/sumate/registro", label: "Crear cuenta" }}
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
            Contraseña
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

        {error ? <AuthFormStatus tone="error" message={error} /> : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/sumate/recuperar" className="font-semibold text-blue-600 hover:text-blue-700">
            Olvidé mi contraseña
          </Link>

          <Link href="/sumate/registro" className="font-semibold text-slate-600 hover:text-slate-900">
            Crear cuenta
          </Link>
        </div>
      </form>
    </AccessPageShell>
  )
}
