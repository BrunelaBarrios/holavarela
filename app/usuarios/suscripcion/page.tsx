'use client'

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, ExternalLink, ShieldOff } from "lucide-react"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import {
  getSubscriptionPlan,
  subscriptionPlans,
  type SubscriptionPlanKey,
} from "../../lib/subscriptionPlans"
import {
  getSubscriptionStatusBadge,
  getSubscriptionStatusLabel,
} from "../../lib/subscriptionStatus"
import {
  findUserOwnedEntity,
  userEntityLabels,
  type UserOwnedEntity,
} from "../../lib/userProfiles"
import { supabase } from "../../supabase"

export default function UsuariosSuscripcionPage() {
  const router = useRouter()
  const [ownedEntity, setOwnedEntity] = useState<UserOwnedEntity | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>("presencia")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const loadSubscription = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.email) {
        router.replace("/usuarios/login")
        return
      }

      try {
        const entity = await findUserOwnedEntity(session.user.email)

        if (!entity || entity.type === "institucion") {
          router.replace("/usuarios")
          return
        }

        setOwnedEntity(entity)
        setSelectedPlan((entity.record.plan_suscripcion as SubscriptionPlanKey) || "presencia")
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar tu suscripción.")
      } finally {
        setLoading(false)
      }
    }

    void loadSubscription()
  }, [router])

  const handleSavePlan = async (planToSave = selectedPlan) => {
    if (!ownedEntity) return

    setSaving(true)
    setError("")
    setSuccess("")

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      setError("Tu sesión venció. Vuelve a entrar para gestionar la suscripción.")
      setSaving(false)
      return
    }

    const response = await fetch("/api/usuarios/suscripcion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: "save_plan",
        planKey: planToSave,
      }),
    })

    const result = (await response.json()) as {
      error?: string
      syncedWithMercadoPago?: boolean
      record?: UserOwnedEntity["record"]
    }

    if (!response.ok || !result.record) {
      setError(result.error || "No pudimos actualizar tu plan.")
      setSaving(false)
      return
    }

    setOwnedEntity((current) =>
      current
        ? {
            ...current,
            record: result.record!,
          }
        : current
    )
    setSuccess(
      result.syncedWithMercadoPago
        ? "Tu plan quedó actualizado y también se sincronizó con Mercado Pago."
        : "Tu plan quedó guardado. Ahora puedes continuar el pago cuando quieras."
    )
    setSaving(false)
  }

  const handleCancelSubscription = async () => {
    if (!ownedEntity) return

    const confirmed = window.confirm(
      "Si cancelas la suscripción, tu ficha y sus eventos visibles pasarán a oculto. ¿Quieres continuar?"
    )

    if (!confirmed) return

    setCancelling(true)
    setError("")
    setSuccess("")

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      setError("Tu sesión venció. Vuelve a entrar para gestionar la suscripción.")
      setCancelling(false)
      return
    }

    const response = await fetch("/api/usuarios/suscripcion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: "cancel_subscription",
      }),
    })

    const result = (await response.json()) as {
      error?: string
      syncedWithMercadoPago?: boolean
      record?: UserOwnedEntity["record"]
    }

    if (!response.ok || !result.record) {
      setError(result.error || "No pudimos cancelar tu suscripción.")
      setCancelling(false)
      return
    }

    setOwnedEntity((current) =>
      current
        ? {
            ...current,
            record: result.record!,
          }
        : current
    )
    setSuccess(
      result.syncedWithMercadoPago
        ? "Tu suscripción quedó cancelada y también se sincronizó con Mercado Pago."
        : "Tu suscripción quedó cancelada y la ficha pasó a oculto."
    )
    setCancelling(false)
  }

  const currentPlan = getSubscriptionPlan(ownedEntity?.record.plan_suscripcion)
  const nextPlan = subscriptionPlans[selectedPlan]
  const statusLabel = getSubscriptionStatusLabel(ownedEntity?.record.estado_suscripcion)
  const statusBadge = getSubscriptionStatusBadge(ownedEntity?.record.estado_suscripcion)
  const subscriptionUpdatedAt = ownedEntity?.record.suscripcion_actualizada_at
    ? new Date(ownedEntity.record.suscripcion_actualizada_at).toLocaleDateString("es-UY", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
          <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
            <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              Suscripción
            </div>

            <div className="mt-6 grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
              <div className="space-y-5">
                <div>
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl xl:text-6xl">
                    Gestiona tu plan
                  </h1>
                  <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                    Piensa esta pantalla como un flujo simple: primero eliges tu plan, después guardas el cambio y por último continúas el pago.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <StepCard
                    number="1"
                    title="Elige tu plan"
                    description="Selecciona la opción que quieras usar en tu ficha."
                  />
                  <StepCard
                    number="2"
                    title="Guarda el cambio"
                    description="Deja registrada tu elección antes de pagar."
                  />
                  <StepCard
                    number="3"
                    title="Continúa el pago"
                    description="Abre Mercado Pago cuando ya tengas definido el plan."
                  />
                </div>
              </div>

              <div className="grid gap-4">
                {!loading && ownedEntity ? (
                  <>
                    <SummaryCard
                      label="Ficha vinculada"
                      title={ownedEntity.record.nombre}
                      description={userEntityLabels[ownedEntity.type]}
                    />
                    <SummaryCard
                      label="Estado actual"
                      title={statusLabel}
                      description={`Plan actual: ${currentPlan.name}`}
                      badge={
                        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusBadge}`}>
                          {statusLabel}
                        </span>
                      }
                    />
                    <SummaryCard
                      label="Último cambio"
                      title={subscriptionUpdatedAt || "Sin fecha registrada"}
                      description={
                        subscriptionUpdatedAt
                          ? "Fecha guardada del último cambio o actualización."
                          : "Todavía no hay una fecha guardada para esta suscripción."
                      }
                    />
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.2)] sm:p-8 lg:p-10">
          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              Cargando suscripción...
            </div>
          ) : ownedEntity ? (
            <div className="space-y-6">
              {error ? <AuthFormStatus tone="error" message={error} /> : null}
              {success ? <AuthFormStatus tone="success" message={success} /> : null}

              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Plan en preparación
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Ahora mismo tienes seleccionado <span className="font-semibold text-slate-900">{nextPlan.name}</span>. Cuando confirmes este paso, ese será el plan que usará tu ficha.
                    </p>
                  </div>
                  <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    {nextPlan.price}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                {(Object.entries(subscriptionPlans) as Array<
                  [SubscriptionPlanKey, (typeof subscriptionPlans)[SubscriptionPlanKey]]
                >).map(([planKey, plan]) => (
                  <div
                    key={planKey}
                    className={`flex h-full flex-col rounded-[30px] border p-6 transition ${
                      selectedPlan === planKey
                        ? "border-blue-500 bg-blue-50 shadow-[0_18px_40px_-24px_rgba(37,99,235,0.45)]"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {plan.shortLabel}
                        </div>
                        <div className="mt-2 text-[2rem] font-semibold leading-[1.05] text-slate-950">
                          {plan.name}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                        {plan.price}
                      </div>
                    </div>

                    <p className="mt-5 text-base leading-7 text-slate-600">{plan.tagline}</p>
                    <p className="mt-4 text-sm leading-7 text-slate-500">{plan.description}</p>

                    <div className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(planKey)}
                        disabled={cancelling}
                        className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                          selectedPlan === planKey
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600"
                        } disabled:opacity-60`}
                      >
                        {selectedPlan === planKey ? "Plan elegido" : "Elegir este plan"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Flujo de suscripción
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">1. Elige plan</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">2. Guarda cambio</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700">3. Continúa el pago</span>
                    </div>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                      Primero guarda el plan que quieres usar. Después recién abre Mercado Pago. Si todavía no quieres pagar, puedes dejar el cambio guardado y volver más tarde.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 xl:min-w-[280px]">
                    <button
                      type="button"
                      onClick={() => void handleSavePlan()}
                      disabled={saving || cancelling}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
                    >
                      <CreditCard className="h-4 w-4" />
                      {saving ? "Guardando..." : "Guardar cambio"}
                    </button>

                    <a
                      href={nextPlan.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Continuar pago en Mercado Pago
                    </a>

                    <Link
                      href="/usuarios"
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Volver al panel
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 rounded-[24px] border border-rose-200 bg-rose-50/70 px-5 py-4">
                <button
                  type="button"
                  onClick={() => void handleCancelSubscription()}
                  disabled={saving || cancelling}
                  className="inline-flex items-center gap-2 text-sm font-medium text-rose-700 transition hover:text-rose-800 disabled:opacity-60"
                >
                  <ShieldOff className="h-4 w-4" />
                  {cancelling ? "Cancelando..." : "Cancelar mi suscripción"}
                </button>
                <p className="text-sm leading-6 text-rose-700/80">
                  Si cancelas, tu ficha y sus eventos visibles pasarán a oculto hasta que vuelvas a activarla.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
        {number}
      </div>
      <div className="mt-4 text-lg font-semibold text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}

function SummaryCard({
  label,
  title,
  description,
  badge,
}: {
  label: string
  title: string
  description: string
  badge?: ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="text-2xl font-semibold text-slate-950">{title}</div>
        {badge}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}
