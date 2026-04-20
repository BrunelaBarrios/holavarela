'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { supabase } from "../../supabase"

const inputClassName =
  "w-full rounded-2xl bg-white px-4 py-3 text-base font-medium text-slate-950 caret-slate-950 outline-none placeholder:text-slate-400 autofill:text-slate-950 [-webkit-text-fill-color:#020617] [transition:background-color_9999s_ease-out,color_9999s_ease-out] [-webkit-box-shadow:0_0_0px_1000px_white_inset]"

export default function UsuariosContrasenaPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.email) {
        router.replace("/usuarios/login")
        return
      }

      setEmail(session.user.email)
      setLoading(false)
    }

    void loadSession()
  }, [router])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (newPassword.length < 6) {
      setError("La nueva contrasena debe tener al menos 6 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("La confirmacion no coincide con la nueva contrasena.")
      return
    }

    if (!email) {
      setError("No pudimos validar tu cuenta actual.")
      return
    }

    setSaving(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })

    if (signInError) {
      setError("La contrasena actual no es correcta.")
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setError(`No pudimos cambiar tu contrasena: ${updateError.message}`)
      setSaving(false)
      return
    }

    setSuccess("Tu contrasena fue actualizada. Vas a volver a iniciar sesion con la nueva clave.")
    setSaving(false)

    window.setTimeout(async () => {
      await supabase.auth.signOut()
      router.push("/usuarios/login")
      router.refresh()
    }, 1200)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
          <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            Seguridad
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Cambia tu contrasena
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Para hacerlo de forma segura te pedimos tu clave actual antes de guardar la nueva.
          </p>

          <div className="mt-8 rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Cuenta actual
            </div>
            <div className="mt-3 text-lg font-semibold text-slate-950">{email || "Cargando"}</div>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/usuarios"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Volver al panel
            </Link>
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              Cargando seguridad...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Field
                label="Contrasena actual"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                visible={showCurrentPassword}
                onToggleVisibility={() => setShowCurrentPassword((current) => !current)}
              />
              <Field
                label="Nueva contrasena"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                visible={showNewPassword}
                onToggleVisibility={() => setShowNewPassword((current) => !current)}
              />
              <Field
                label="Confirmar nueva contrasena"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                visible={showConfirmPassword}
                onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
              />

              {error ? <AuthFormStatus tone="error" message={error} /> : null}
              {success ? <AuthFormStatus tone="success" message={success} /> : null}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
              >
                {saving ? "Actualizando..." : "Guardar nueva contrasena"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
  type,
  visible,
  onToggleVisibility,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  type: string
  visible: boolean
  onToggleVisibility: () => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white pr-2 shadow-sm transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          className={inputClassName}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={visible ? "Ocultar contrasena" : "Mostrar contrasena"}
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}
