'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, BarChart3, MessageCircle } from "lucide-react"
import { supabase } from "../../supabase"
import { recordSiteVisit } from "../../lib/contentVisits"

type InteractionRow = {
  created_at: string | null
}

type RecentActivity = {
  interactions15Days: number
  whatsapp15Days: number
}

type RecentMessage = {
  label: string
  value: number
}

const getIsoDaysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

const withFallback = async <T,>(
  promiseLike: PromiseLike<{ data: T[] | null; error: unknown }>,
  label: string
) => {
  const { data, error } = await promiseLike
  if (error) {
    console.warn(`No se pudo cargar ${label}.`, error)
    return [] as T[]
  }
  return (data || []) as T[]
}

export default function UsuariosMetricasHolaVarelaPage() {
  const [loading, setLoading] = useState(true)
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({
    interactions15Days: 0,
    whatsapp15Days: 0,
  })

  useEffect(() => {
    const loadMetrics = async () => {
      const since15 = getIsoDaysAgo(15)
      const since2 = getIsoDaysAgo(2)

      const [
        shareRows15,
        whatsappRows15,
        viewMoreRows15,
        externalRows15,
        likesRows15,
        contactRows48,
        likesRows48,
        eventRows48,
        commerceRows48,
        serviceRows48,
        courseRows48,
        institutionRows48,
      ] = await Promise.all([
        withFallback<InteractionRow>(
          supabase.from("share_events").select("created_at").gte("created_at", since15),
          "los compartidos de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase.from("whatsapp_clicks").select("created_at").gte("created_at", since15),
          "los clics de WhatsApp de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase.from("view_more_clicks").select("created_at").gte("created_at", since15),
          "los clics en ver mas de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase.from("external_link_clicks").select("created_at").gte("created_at", since15),
          "los clics externos de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase.from("event_likes").select("created_at").gte("created_at", since15),
          "los likes de 15 dias"
        ),
        withFallback<InteractionRow>(
          supabase.from("contacto_solicitudes").select("created_at").gte("created_at", since2),
          "los mensajes de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("event_likes").select("created_at").gte("created_at", since2),
          "los likes de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("eventos").select("created_at").gte("created_at", since2),
          "los eventos nuevos de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("comercios").select("created_at").gte("created_at", since2),
          "los comercios nuevos de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("servicios").select("created_at").gte("created_at", since2),
          "los servicios nuevos de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("cursos").select("created_at").gte("created_at", since2),
          "los cursos nuevos de 48 horas"
        ),
        withFallback<InteractionRow>(
          supabase.from("instituciones").select("created_at").gte("created_at", since2),
          "las instituciones nuevas de 48 horas"
        ),
      ])

      setRecentActivity({
        interactions15Days:
          shareRows15.length +
          whatsappRows15.length +
          viewMoreRows15.length +
          externalRows15.length +
          likesRows15.length,
        whatsapp15Days: whatsappRows15.length,
      })

      const listings48 =
        commerceRows48.length +
        serviceRows48.length +
        courseRows48.length +
        institutionRows48.length

      setRecentMessages(
        [
          {
            label: `${contactRows48.length} ${contactRows48.length === 1 ? "mensaje nuevo" : "mensajes nuevos"}`,
            value: contactRows48.length,
          },
          {
            label: `${likesRows48.length} ${likesRows48.length === 1 ? "nuevo like" : "nuevos likes"}`,
            value: likesRows48.length,
          },
          {
            label: `${eventRows48.length} ${eventRows48.length === 1 ? "nuevo evento subido" : "nuevos eventos subidos"}`,
            value: eventRows48.length,
          },
          {
            label: `${listings48} ${listings48 === 1 ? "nueva ficha se sumo" : "nuevas fichas se sumaron"}`,
            value: listings48,
          },
        ].filter((item) => item.value > 0)
      )

      setLoading(false)
    }

    void loadMetrics()
  }, [])

  useEffect(() => {
    void recordSiteVisit("usuarios-metricas", "Metricas Hola Varela")
  }, [])

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_48%,#ffffff_100%)] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 shadow-sm">
              Metricas de Hola Varela
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950">
              Movimiento general de la plataforma
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-600">
              Aqui ves la actividad registrada por Hola Varela dentro de la web, sin mezclarla con metricas externas.
            </p>
          </div>
          <Link
            href="/usuarios"
            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </Link>
        </div>

        {loading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-slate-500 shadow-sm">
            Cargando metricas de Hola Varela...
          </div>
        ) : (
          <div className="space-y-8">
            <section className="grid gap-4 md:grid-cols-2">
              <MetricCard
                label="Actividad reciente"
                value={recentActivity.interactions15Days}
                description="Interacciones ultimos 15 dias"
                icon={<BarChart3 className="h-5 w-5 text-emerald-700" />}
                tone="bg-emerald-100"
              />
              <MetricCard
                label="Contactos rapidos"
                value={recentActivity.whatsapp15Days}
                description="WhatsApp ultimos 15 dias"
                icon={<MessageCircle className="h-5 w-5 text-green-700" />}
                tone="bg-green-100"
              />
            </section>

            <div className="grid gap-6">
              <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Trafico general
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-slate-950">Visitantes y vistas del sitio</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  Resumen general del movimiento y las visitas dentro de Hola Varela.
                </p>
              </section>

              <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Actividad reciente
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">Ultimas 48 horas</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Un resumen rapido de lo ultimo que paso dentro de Hola Varela.
                  </p>
                </div>
                <div className="space-y-4">
                  {recentMessages.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                      Aun no hay novedades registradas en las ultimas 48 horas.
                    </div>
                  ) : (
                    recentMessages.map((item) => (
                      <ActivityMessage key={item.label} label={item.label} />
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function MetricCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string
  value: number
  description: string
  icon: React.ReactNode
  tone: string
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
          <div className="mt-3 text-4xl font-semibold text-slate-950">{value}</div>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>{icon}</div>
      </div>
      <div className="text-sm text-slate-500">{description}</div>
    </div>
  )
}

function ActivityMessage({ label }: { label: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium text-slate-700">
      {label}
    </div>
  )
}
