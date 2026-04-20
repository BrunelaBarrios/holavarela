'use client'

import Image from "next/image"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, LockKeyhole, UserRound, Users } from "lucide-react"
import { supabase } from "../../supabase"

const inputClassName =
  "w-full bg-transparent text-base font-medium text-slate-950 caret-slate-950 outline-none placeholder:text-slate-400 autofill:text-slate-950 [-webkit-text-fill-color:#020617] [transition:background-color_9999s_ease-out,color_9999s_ease-out] [-webkit-box-shadow:0_0_0px_1000px_white_inset]"

export default function UsuariosLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const resetSession = async () => {
      await supabase.auth.signOut()
    }

    void resetSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError("Email o contrasena incorrectos.")
      setLoading(false)
      return
    }

    router.push("/usuarios")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center">
            <Image
              src="/logo-varela-grande.png"
              alt="Hola Varela"
              width={196}
              height={56}
              className="h-14 w-auto"
            />
          </div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <Users className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">Ingreso de usuarios</h1>
          <p className="mt-2 text-slate-500">
            Inicia sesion con tu email y contrasena para entrar a tu espacio.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">Email</label>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
              <UserRound className="h-5 w-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClassName}
                placeholder="tuemail@ejemplo.com"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">Contrasena</label>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
              <LockKeyhole className="h-5 w-5 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClassName}
                placeholder="********"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm">
          <Link href="/usuarios/recuperar-whatsapp" className="font-medium text-emerald-700 hover:text-emerald-600">
            Solicitar nueva contrasena al admin
          </Link>
        </div>

        <div className="mt-4 text-center text-sm text-slate-500">
          <Link href="/" className="font-medium text-slate-700 hover:text-slate-900">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
