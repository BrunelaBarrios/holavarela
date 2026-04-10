'use client'

import Link from "next/link"
import { useState } from "react"
import { BellRing, KeyRound, ShieldCheck } from "lucide-react"
import { AuthFormStatus } from "../../components/AuthFormStatus"

export default function UsuariosRecuperarWhatsappPage() {
  const [email, setEmail] = useState("")
  const [contactName, setContactName] = useState("")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/auth/recovery/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          contactName,
          phone,
          message,
        }),
      })

      const result = (await response.json()) as { error?: string; message?: string }

      if (!response.ok) {
        throw new Error(result.error || "No pudimos enviar la solicitud.")
      }

      setSuccess(
        result.message ||
          "Tu solicitud fue enviada al administrador. Te responderan con una nueva contrasena."
      )
      setEmail("")
      setContactName("")
      setPhone("")
      setMessage("")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos enviar la solicitud."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
          <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Acceso
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Solicitar nueva contrasena
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Si perdiste tu clave, deja el email de la cuenta y el admin recibira una notificacion para asignarte una nueva.
          </p>

          <div className="mt-8 rounded-[24px] border border-white/70 bg-white/85 p-5 backdrop-blur">
            <div className="flex items-start gap-3">
              <BellRing className="mt-1 h-5 w-5 text-emerald-600" />
              <div>
                <div className="text-sm font-semibold text-slate-900">Como funciona</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  El administrador vera tu pedido en el panel, podra cargarte una nueva contrasena y luego tu mismo la podras cambiar desde tu perfil.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-sky-100 bg-sky-50/80 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-sky-600" />
              <div>
                <div className="text-sm font-semibold text-slate-900">Privacidad</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Aqui no se ingresa una contrasena nueva. Solo se registra tu solicitud para que el admin gestione el acceso de forma segura.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/usuarios/login"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
            >
              Volver al login
            </Link>
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          <div className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white">
            Formulario
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="rounded-2xl bg-white p-3 text-slate-900 shadow-sm">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                El admin recibe la alerta en su panel
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Completa tus datos y deja una referencia para que te ubiquen rapido.
              </p>
            </div>
          </div>

          {error ? <div className="mt-6"><AuthFormStatus tone="error" message={error} /></div> : null}
          {success ? <div className="mt-6"><AuthFormStatus tone="success" message={success} /></div> : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <Field
              label="Email de la cuenta"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="username"
              placeholder="tuemail@ejemplo.com"
              required
            />

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Nombre o referencia"
                type="text"
                value={contactName}
                onChange={setContactName}
                autoComplete="name"
                placeholder="Ej: Maria del kiosco"
              />
              <Field
                label="Telefono"
                type="text"
                value={phone}
                onChange={setPhone}
                autoComplete="tel"
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Mensaje para el admin</label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                placeholder="Ej: perdi la contrasena y necesito entrar hoy."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70"
            >
              {loading ? "Enviando solicitud..." : "Solicitar nueva contrasena"}
            </button>
          </form>
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
  placeholder,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  type: string
  placeholder: string
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400"
      />
    </div>
  )
}
