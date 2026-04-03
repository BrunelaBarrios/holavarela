'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { CreditCard, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import { getSubscriptionPlan, subscriptionPlans, type SubscriptionPlanKey } from "../../lib/subscriptionPlans"
import { getSubscriptionStatusBadge, getSubscriptionStatusLabel } from "../../lib/subscriptionStatus"
import { findUserOwnedEntity, getUserProfileTable, userEntityLabels, type UserOwnedEntity } from "../../lib/userProfiles"
import { supabase } from "../../supabase"

export default function UsuariosSuscripcionPage() {
  const router = useRouter()
  const [ownedEntity, setOwnedEntity] = useState<UserOwnedEntity | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>("presencia")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  const handleSavePlan = async () => {
    if (!ownedEntity) return

    setSaving(true)
    setError("")
    setSuccess("")

    const { error: updateError } = await supabase
      .from(getUserProfileTable(ownedEntity.type))
      .update({ plan_suscripcion: selectedPlan })
      .eq("id", ownedEntity.record.id)

    if (updateError) {
      setError(`No pudimos actualizar tu plan: ${updateError.message}`)
      setSaving(false)
      return
    }

    setOwnedEntity((current) =>
      current
        ? {
            ...current,
            record: {
              ...current.record,
              plan_suscripcion: selectedPlan,
            },
          }
        : current
    )
    setSuccess("Tu plan quedo actualizado. Si quieres, ya puedes continuar al pago.")
    setSaving(false)
  }

  const currentPlan = getSubscriptionPlan(ownedEntity?.record.plan_suscripcion)
  const nextPlan = subscriptionPlans[selectedPlan]
  const statusLabel = getSubscriptionStatusLabel(ownedEntity?.record.estado_suscripcion)
  const statusBadge = getSubscriptionStatusBadge(ownedEntity?.record.estado_suscripcion)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
              <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Suscripcion
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Gestiona tu plan
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Elige el plan que mejor acompana tu ficha y continua el pago desde Mercado Pago cuando quieras.
              </p>

              <div className="mt-8 space-y-4">
                <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Ficha vinculada
                  </div>
                  <div className="mt-3 text-xl font-semibold text-slate-950">
                    {ownedEntity ? ownedEntity.record.nombre : "Cargando"}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {ownedEntity ? userEntityLabels[ownedEntity.type] : "Perfil"}
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
                    Siguiente paso
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Primero guarda el plan que quieres usar en tu ficha y despues abre Mercado Pago para completar la suscripcion.
                  </p>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/usuarios"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Volver al panel
                </Link>
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              {loading ? (
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  Cargando suscripcion...
                </div>
              ) : ownedEntity ? (
                <div className="space-y-6">
                  {error ? <AuthFormStatus tone="error" message={error} /> : null}
                  {success ? <AuthFormStatus tone="success" message={success} /> : null}

                  <div className="grid gap-4 xl:grid-cols-3">
                    {(Object.entries(subscriptionPlans) as Array<[SubscriptionPlanKey, (typeof subscriptionPlans)[SubscriptionPlanKey]]>).map(([planKey, plan]) => (
                      <div
                        key={planKey}
                        className={`rounded-[28px] border p-5 transition ${
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
                              <div className="mt-2 text-2xl font-semibold text-slate-950">
                                {plan.name}
                              </div>
                            </div>
                            <div className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                              {plan.price}
                            </div>
                          </div>
                          <p className="mt-4 text-sm leading-6 text-slate-600">{plan.tagline}</p>
                          <p className="mt-3 text-sm leading-6 text-slate-500">{plan.description}</p>
                          <div className="mt-5 space-y-2 text-sm leading-6 text-slate-600">
                            {plan.features.map((feature) => (
                              <div key={feature} className="flex gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        </button>
                        <a
                          href={plan.checkoutUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Abrir Mercado Pago
                        </a>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Plan seleccionado
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-slate-950">{nextPlan.name}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{nextPlan.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleSavePlan()}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-70"
                      >
                        <CreditCard className="h-4 w-4" />
                        {saving ? "Guardando..." : "Guardar plan"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
