'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { CreditCard, ExternalLink, ShieldOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { getSubscriptionPlan, subscriptionPlans, type SubscriptionPlanKey } from "../../lib/subscriptionPlans"
import { getSubscriptionStatusBadge, getSubscriptionStatusLabel } from "../../lib/subscriptionStatus"
import { findUserOwnedEntity, userEntityLabels, type UserOwnedEntity } from "../../lib/userProfiles"
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

        if (!entity) {
          router.replace("/usuarios")
          return
        }

        if (entity.type === "institucion") {
          router.replace("/usuarios")
          return
        }

        setOwnedEntity(entity)
        setSelectedPlan((entity.record.plan_suscripcion as SubscriptionPlanKey) || "presencia")
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "No pudimos cargar tu suscripcion.")
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
      setError("Tu sesion vencio. Vuelve a entrar para gestionar la suscripcion.")
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

    const updatedRecord = result.record

    setOwnedEntity((current) =>
      current
        ? {
            ...current,
            record: updatedRecord,
          }
        : current
    )
    setSuccess(
      result.syncedWithMercadoPago
        ? "Tu plan quedo actualizado y tambien se sincronizo con Mercado Pago."
        : "Tu plan quedo actualizado. Cuando quieras, continua el pago en Mercado Pago."
    )
    setSaving(false)
  }

  const handleCancelSubscription = async () => {
    if (!ownedEntity) return

    const confirmed = window.confirm(
      "Si cancelas la suscripcion, tu ficha y sus eventos visibles pasaran a oculto. ¿Quieres continuar?"
    )

    if (!confirmed) return

    setCancelling(true)
    setError("")
    setSuccess("")
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      setError("Tu sesion vencio. Vuelve a entrar para gestionar la suscripcion.")
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
      setError(result.error || "No pudimos cancelar tu suscripcion.")
      setCancelling(false)
      return
    }

    const updatedRecord = result.record

    setOwnedEntity((current) =>
      current
        ? {
            ...current,
            record: updatedRecord,
          }
        : current
    )
    setSuccess(
      result.syncedWithMercadoPago
        ? "Tu suscripcion quedo cancelada y tambien se sincronizo con Mercado Pago."
        : "Tu suscripcion quedo cancelada y la ficha paso a oculto."
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
      <div className="mx-auto max-w-[1440px] space-y-6">
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
          <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Suscripcion
              </div>
              {!loading && ownedEntity ? (
                <button
                  type="button"
                  onClick={() => void handleCancelSubscription()}
                  disabled={saving || cancelling}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60"
                >
                  <ShieldOff className="h-4 w-4" />
                  {cancelling ? "Cancelando..." : "Cancelar mi suscripcion"}
                </button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-8 xl:grid-cols-[1.05fr_1.2fr] xl:items-end">
              <div className="max-w-3xl">
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl xl:text-6xl">
                  Gestiona tu plan
                </h1>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
                  Elige el plan que mejor acompana tu ficha, guardalo y despues continua el pago desde Mercado Pago cuando lo necesites.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 xl:justify-end">
                <Link
                  href="/usuarios"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Volver al panel
                </Link>
                {!loading && ownedEntity ? (
                  <button
                    type="button"
                    onClick={() => void handleSavePlan()}
                    disabled={saving || cancelling}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
                  >
                    <CreditCard className="h-4 w-4" />
                    {saving ? "Guardando..." : "Guardar plan"}
                  </button>
                ) : null}
                {!loading && ownedEntity ? (
                  <a
                    href={nextPlan.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Continuar pago en Mercado Pago
                  </a>
                ) : null}
              </div>
            </div>

            {!loading && ownedEntity ? (
              <div className="mt-8 grid gap-4 xl:grid-cols-4">
                <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Ficha vinculada
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-slate-950">
                    {ownedEntity.record.nombre}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {userEntityLabels[ownedEntity.type]}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Estado de la suscripcion
                  </div>
                  <div className="mt-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusBadge}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Plan actual: <span className="font-semibold text-slate-900">{currentPlan.name}</span>
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Suscripcion registrada
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-slate-950">
                    {subscriptionUpdatedAt || "Sin fecha registrada"}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {subscriptionUpdatedAt
                      ? ownedEntity.record.estado_suscripcion === "activa"
                        ? "Fecha registrada de la ultima activacion o cambio de plan."
                        : "Fecha del ultimo cambio guardado en tu suscripcion."
                      : "Todavia no hay una fecha guardada para esta suscripcion."}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Plan seleccionado ahora
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-slate-950">{nextPlan.name}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{nextPlan.price}</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.2)] sm:p-8 lg:p-10">
          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              Cargando suscripcion...
            </div>
          ) : ownedEntity ? (
            <div className="space-y-6">
              {error ? <AuthFormStatus tone="error" message={error} /> : null}
              {success ? <AuthFormStatus tone="success" message={success} /> : null}

              <div className="grid gap-6 xl:grid-cols-3">
                {(Object.entries(subscriptionPlans) as Array<[SubscriptionPlanKey, (typeof subscriptionPlans)[SubscriptionPlanKey]]>).map(([planKey, plan]) => (
                  <div
                    key={planKey}
                    className={`flex h-full flex-col rounded-[30px] border p-6 transition ${
                      selectedPlan === planKey
                        ? "border-blue-500 bg-blue-50 shadow-[0_18px_40px_-24px_rgba(37,99,235,0.45)]"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPlan(planKey)}
                      className="block w-full text-left"
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
                    </button>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlan(planKey)
                          void handleSavePlan(planKey)
                        }}
                        disabled={saving || cancelling}
                        className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                          selectedPlan === planKey
                            ? "bg-slate-900 text-white hover:bg-blue-600"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600"
                        } disabled:opacity-60`}
                      >
                        {selectedPlan === planKey ? "Guardar este plan" : "Cambiar a este plan y guardar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Siguiente paso
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  Guarda el plan que quieres usar en tu ficha y despues continua el pago desde el boton superior. El cambio de plan queda registrado en Hola Varela, pero Mercado Pago no se entera solo: para sincronizarlo automatico habria que integrar webhooks o la API de suscripciones.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
