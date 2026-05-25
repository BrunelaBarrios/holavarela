"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Mail,
  Phone,
  Send,
  Store,
  UserRound,
} from "lucide-react"
import { PublicHeader } from "../components/PublicHeader"
import { serializePublicLead } from "../lib/publicLead"
import { buildPublicNav } from "../lib/publicNav"
import type { subscriptionPlans, SubscriptionPlanKey } from "../lib/subscriptionPlans"

type PlansForUser = typeof subscriptionPlans
type EntityKind = "comercio" | "servicio"

type SuscripcionesLandingClientProps = {
  plans: PlansForUser
}

const entityKindLabels: Record<EntityKind, string> = {
  comercio: "Comercio",
  servicio: "Servicio o profesional",
}

const planOrder: SubscriptionPlanKey[] = ["presencia", "destacado", "destacado_plus"]

const initialForm = {
  senderName: "",
  senderEmail: "",
  senderPhone: "",
  listingName: "",
  notes: "",
}

export function SuscripcionesLandingClient({ plans }: SuscripcionesLandingClientProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>("destacado")
  const [entityKind, setEntityKind] = useState<EntityKind>("comercio")
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const selectedPlanCopy = plans[selectedPlan]

  const formSummary = useMemo(
    () => [
      { label: "Plan elegido", value: selectedPlanCopy.name },
      { label: "Precio", value: selectedPlanCopy.price },
      { label: "Tipo de ficha", value: entityKindLabels[entityKind] },
    ],
    [entityKind, selectedPlanCopy.name, selectedPlanCopy.price]
  )

  const updateForm = (key: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    const nombre = form.senderName.trim()
    const email = form.senderEmail.trim()
    const telefono = form.senderPhone.trim()
    const listingName = form.listingName.trim()

    const message = serializePublicLead({
      version: 1,
      type: "suscripcion",
      senderName: nombre,
      senderEmail: email,
      senderPhone: telefono,
      listingName,
      listingDescription: `Solicitud de suscripcion para ${entityKindLabels[entityKind]}. Plan elegido: ${selectedPlanCopy.name} (${selectedPlanCopy.price}).`,
      listingAddress: entityKindLabels[entityKind],
      listingPhone: telefono,
      listingImage: null,
      notes:
        [
          `Plan elegido: ${selectedPlanCopy.name}`,
          `Precio: ${selectedPlanCopy.price}`,
          `Email: ${email}`,
          form.notes.trim() ? `Notas: ${form.notes.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n") || undefined,
    })

    const response = await fetch("/api/contacto", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre,
        email,
        telefono,
        mensaje: message,
      }),
    })

    const result = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null

    setLoading(false)

    if (!response.ok) {
      setError(result?.error || "No pudimos enviar la solicitud. Proba de nuevo.")
      return
    }

    setForm(initialForm)
    setSuccess(
      "Recibimos tu solicitud. Te vamos a contactar para activar tu cuenta y dejar el plan listo."
    )
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicHeader items={buildPublicNav("suscripciones")} />

      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute right-[-120px] top-1/2 h-[520px] w-[520px] -translate-y-1/2 opacity-10 sm:right-0 sm:h-[680px] sm:w-[680px]">
          <Image
            src="/logo-varela-chico.png"
            alt=""
            fill
            priority
            sizes="680px"
            className="object-contain"
          />
        </div>
        <div className="absolute inset-0 bg-slate-950/90" />
        <div className="relative mx-auto flex min-h-[640px] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-sky-100">
              <BadgeCheck className="h-4 w-4" />
              Planes para comercios y servicios locales
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              Elegi como queres aparecer en Hola Varela
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              Tres opciones para estar presente, destacar tu ficha y mover promociones,
              eventos o sorteos con mas visibilidad dentro de la cartelera.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#registro"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                Registrarme
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#planes"
                className="inline-flex items-center rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Ver planes
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="planes" className="border-b border-slate-200 bg-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              Suscripciones
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Compara beneficios y selecciona el plan que mejor acompane el momento de
              tu negocio o servicio.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {planOrder.map((planKey) => {
              const plan = plans[planKey]
              const isSelected = selectedPlan === planKey

              return (
                <button
                  key={planKey}
                  type="button"
                  onClick={() => setSelectedPlan(planKey)}
                  className={`flex h-full flex-col rounded-lg border p-5 text-left transition ${
                    isSelected
                      ? "border-sky-500 bg-white shadow-[0_18px_50px_-32px_rgba(2,132,199,0.75)]"
                      : "border-slate-200 bg-white hover:border-sky-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {plan.shortLabel}
                      </div>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                        {plan.name}
                      </h3>
                    </div>
                    <span className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
                      {plan.price}
                    </span>
                  </div>

                  <p className="mt-4 text-base leading-7 text-slate-700">{plan.tagline}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-500">{plan.description}</p>

                  <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-6">
                    <span
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                        isSelected
                          ? "bg-sky-100 text-sky-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isSelected ? "Seleccionado" : "Elegir este plan"}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section id="registro" className="bg-white py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              <ClipboardList className="h-4 w-4" />
              Registro
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
              Dejanos tus datos y lo vemos desde admin
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              La solicitud entra como pendiente en el panel de Contactos y tambien
              dispara el aviso por email si las notificaciones estan configuradas.
            </p>

            <div className="mt-6 space-y-3">
              {formSummary.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <span className="text-sm font-medium text-slate-500">{item.label}</span>
                  <span className="text-right text-sm font-semibold text-slate-950">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                icon={<UserRound className="h-4 w-4" />}
                label="Tu nombre"
                value={form.senderName}
                onChange={(value) => updateForm("senderName", value)}
                placeholder="Nombre y apellido"
                required
              />
              <Field
                icon={<Phone className="h-4 w-4" />}
                label="Telefono"
                value={form.senderPhone}
                onChange={(value) => updateForm("senderPhone", value)}
                placeholder="WhatsApp de contacto"
                required
                type="tel"
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={form.senderEmail}
                onChange={(value) => updateForm("senderEmail", value)}
                placeholder="tuemail@ejemplo.com"
                required
                type="email"
              />
              <Field
                icon={<Store className="h-4 w-4" />}
                label="Nombre de la ficha"
                value={form.listingName}
                onChange={(value) => updateForm("listingName", value)}
                placeholder="Comercio, servicio o marca"
                required
              />
            </div>

            <div className="mt-4">
              <div className="mb-2 text-sm font-medium text-slate-700">Tipo de ficha</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(entityKindLabels) as EntityKind[]).map((kind) => (
                  <label
                    key={kind}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition ${
                      entityKind === kind
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-slate-200 text-slate-700 hover:border-sky-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="entityKind"
                      value={kind}
                      checked={entityKind === kind}
                      onChange={() => setEntityKind(kind)}
                      className="h-4 w-4 border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>{entityKindLabels[kind]}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-700">
              Comentario opcional
              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                placeholder="Contanos si ya estas en la web, si queres publicar algo puntual o cualquier dato util."
              />
            </label>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                {success}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {loading ? "Enviando..." : "Enviar registro"}
              </button>
              <Link
                href="/usuarios/login"
                className="inline-flex items-center rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  required,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  icon: React.ReactNode
  required?: boolean
  type?: string
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <span className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 transition focus-within:border-sky-400">
        <span className="text-slate-400">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
        />
      </span>
    </label>
  )
}
