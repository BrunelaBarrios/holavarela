'use client'

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AccessPageShell } from "../../components/AccessPageShell"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { supabase } from "../../supabase"

export default function SumateRegistroPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

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
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const registeredUser = data.user
    if (registeredUser?.id && registeredUser.email) {
      const { error: profileError } = await supabase
        .from("usuarios_registrados")
        .upsert(
          {
            user_id: registeredUser.id,
            email: registeredUser.email,
          },
          { onConflict: "email" }
        )

      if (profileError) {
        setError("La cuenta se creó, pero no pudimos registrar el perfil público.")
        setLoading(false)
        return
      }
    }

    setSuccess("Tu cuenta quedó creada. Ya podés iniciar sesión para seguir.")
    setLoading(false)
    window.setTimeout(() => {
      router.push("/sumate/login")
    }, 1200)
  }

  return (
    <AccessPageShell
      eyebrow="Registro"
      title="Creá tu cuenta"
      description="Elegí tu propio email y contraseña. También te pedimos confirmación para evitar errores al registrarte."
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

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
            Confirmar contraseña
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
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <div className="text-sm text-slate-500">
          Si ya tenés acceso, podés{" "}
          <Link href="/sumate/login" className="font-semibold text-blue-600 hover:text-blue-700">
            iniciar sesión
          </Link>
          .
        </div>
      </form>
    </AccessPageShell>
  )
}
