'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Building2,
  Calendar,
  FileText,
  GraduationCap,
  Mail,
  MessageCircle,
  Plus,
  Radio,
  Share2,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react"
import { buildActiveEventsFilter, formatEventDateRange } from "../lib/eventDates"
import { buildShareTotals, emptyShareTotals, type ShareTotals } from "../lib/shareTracking"
import {
  buildWhatsappTotals,
  emptyWhatsappTotals,
  type WhatsappTotals,
} from "../lib/whatsappTracking"
import {
  buildViewMoreTotals,
  emptyViewMoreTotals,
  type ViewMoreTotals,
} from "../lib/viewMoreTracking"
import { supabase } from "../supabase"

type EventoResumen = {
  id: string
  titulo: string
  fecha: string
  fecha_fin?: string | null
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [comerciosCount, setComerciosCount] = useState(0)
  const [eventosCount, setEventosCount] = useState(0)
  const [serviciosCount, setServiciosCount] = useState(0)
  const [institucionesCount, setInstitucionesCount] = useState(0)
  const [cursosCount, setCursosCount] = useState(0)
  const [contactosCount, setContactosCount] = useState(0)
  const [usuariosCount, setUsuariosCount] = useState(0)
  const [newComerciosCount, setNewComerciosCount] = useState(0)
  const [newEventosCount, setNewEventosCount] = useState(0)
  const [newContactosCount, setNewContactosCount] = useState(0)
  const [proximosEventos, setProximosEventos] = useState<EventoResumen[]>([])
  const [shareTotals, setShareTotals] = useState<ShareTotals>(emptyShareTotals())
  const [whatsappTotals, setWhatsappTotals] = useState<WhatsappTotals>(emptyWhatsappTotals())
  const [viewMoreTotals, setViewMoreTotals] = useState<ViewMoreTotals>(emptyViewMoreTotals())

  useEffect(() => {
    const cargarDashboard = async () => {
      const today = new Date().toISOString().slice(0, 10)
      const [
        { count: comercios },
        { count: eventos },
        { count: servicios },
        { count: instituciones },
        { count: cursos },
        { count: contactos },
        { count: usuarios },
        { count: newComercios },
        { count: newEventos },
        { count: newContactos },
        { data: eventosData },
        { data: shareRows },
        { data: whatsappRows },
        { data: viewMoreRows },
      ] = await Promise.all([
        supabase.from("comercios").select("*", { count: "exact", head: true }),
        supabase.from("eventos").select("*", { count: "exact", head: true }),
        supabase.from("servicios").select("*", { count: "exact", head: true }),
        supabase.from("instituciones").select("*", { count: "exact", head: true }),
        supabase.from("cursos").select("*", { count: "exact", head: true }),
        supabase.from("contacto_solicitudes").select("*", { count: "exact", head: true }),
        supabase.from("usuarios_registrados").select("*", { count: "exact", head: true }),
        supabase
          .from("comercios")
          .select("*", { count: "exact", head: true })
          .eq("estado", "borrador"),
        supabase
          .from("eventos")
          .select("*", { count: "exact", head: true })
          .eq("estado", "borrador"),
        supabase
          .from("contacto_solicitudes")
          .select("*", { count: "exact", head: true })
          .or("visto.is.null,visto.eq.false"),
        supabase
          .from("eventos")
          .select("id, titulo, fecha, fecha_fin")
          .eq("estado", "activo")
          .or(buildActiveEventsFilter(today))
          .order("fecha", { ascending: true })
          .limit(4),
        supabase.from("share_events").select("section"),
        supabase.from("whatsapp_clicks").select("section"),
        supabase.from("view_more_clicks").select("section"),
      ])

      setComerciosCount(comercios || 0)
      setEventosCount(eventos || 0)
      setServiciosCount(servicios || 0)
      setInstitucionesCount(instituciones || 0)
      setCursosCount(cursos || 0)
      setContactosCount(contactos || 0)
      setUsuariosCount(usuarios || 0)
      setNewComerciosCount(newComercios || 0)
      setNewEventosCount(newEventos || 0)
      setNewContactosCount(newContactos || 0)
      setProximosEventos(eventosData || [])
      setShareTotals(buildShareTotals(shareRows || []))
      setWhatsappTotals(buildWhatsappTotals(whatsappRows || []))
      setViewMoreTotals(buildViewMoreTotals(viewMoreRows || []))
    }

    void cargarDashboard()
  }, [])

  const totalContentCount =
    comerciosCount + eventosCount + serviciosCount + institucionesCount + cursosCount
  const totalInteractions =
    shareTotals.comercios +
    shareTotals.eventos +
    shareTotals.cursos +
    shareTotals.servicios +
    whatsappTotals.comercios +
    whatsappTotals.servicios +
    whatsappTotals.cursos +
    viewMoreTotals.comercios +
    viewMoreTotals.eventos +
    viewMoreTotals.cursos +
    viewMoreTotals.servicios +
    viewMoreTotals.instituciones

  const stats = [
    {
      id: "comercios",
      title: "Comercios",
      value: comerciosCount,
      icon: Store,
      color: "bg-blue-600",
      action: () => router.push("/admin/comercios"),
    },
    {
      id: "eventos",
      title: "Eventos",
      value: eventosCount,
      icon: Calendar,
      color: "bg-emerald-600",
      action: () => router.push("/admin/eventos"),
    },
    {
      id: "servicios",
      title: "Servicios",
      value: serviciosCount,
      icon: ShieldAlert,
      color: "bg-amber-600",
      action: () => router.push("/admin/servicios"),
    },
    {
      id: "instituciones",
      title: "Instituciones",
      value: institucionesCount,
      icon: Building2,
      color: "bg-cyan-600",
      action: () => router.push("/admin/instituciones"),
    },
    {
      id: "cursos",
      title: "Cursos",
      value: cursosCount,
      icon: GraduationCap,
      color: "bg-slate-800",
      action: () => router.push("/admin/cursos"),
    },
    {
      id: "usuarios",
      title: "Usuarios",
      value: usuariosCount,
      icon: Users,
      color: "bg-sky-600",
      action: () => router.push("/admin/usuarios"),
    },
  ]

  const reviewItems = [
    {
      id: "review-contactos",
      title: "Contactos nuevos",
      value: newContactosCount,
      helper: "Mensajes sin visto",
      actionLabel: "Revisar contactos",
      action: () => router.push("/admin/contactos"),
    },
    {
      id: "review-eventos",
      title: "Eventos nuevos",
      value: newEventosCount,
      helper: "Borradores pendientes de publicación",
      actionLabel: "Revisar eventos",
      action: () => router.push("/admin/eventos"),
    },
    {
      id: "review-comercios",
      title: "Comercios nuevos",
      value: newComerciosCount,
      helper: "Altas nuevas pendientes",
      actionLabel: "Revisar comercios",
      action: () => router.push("/admin/comercios"),
    },
  ].filter((item) => item.value > 0)

  const quickActions = [
    {
      label: "Agregar Comercio",
      icon: Plus,
      className: "bg-blue-600 text-white hover:bg-blue-500",
      action: () => router.push("/admin/comercios"),
    },
    {
      label: "Agregar Evento",
      icon: Plus,
      className: "bg-emerald-600 text-white hover:bg-emerald-500",
      action: () => router.push("/admin/eventos"),
    },
    {
      label: "Agregar Servicio",
      icon: Plus,
      className: "bg-amber-600 text-white hover:bg-amber-500",
      action: () => router.push("/admin/servicios"),
    },
    {
      label: "Configurar Radio",
      icon: Radio,
      className: "bg-slate-800 text-white hover:bg-slate-700",
      action: () => router.push("/admin/radio"),
    },
    {
      label: "Ver Contactos",
      icon: Mail,
      className: "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
      action: () => router.push("/admin/contactos"),
    },
    {
      label: "Editar Sitio",
      icon: FileText,
      className: "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
      action: () => router.push("/admin/sitio"),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Panel de administración ordenado por prioridad y actividad.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin/metricas")}
          className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
        >
          <BarChart3 className="h-4 w-4" />
          Ver métricas
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button
          onClick={() => router.push("/admin/contactos")}
          className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-2xl bg-rose-600 p-3 text-white">
              <Mail className="h-6 w-6" />
            </div>
            <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              {newContactosCount}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Pendientes de contacto</h3>
          <p className="mt-2 text-sm text-slate-500">Mensajes nuevos esperando revisión.</p>
        </button>

        <button
          onClick={() => router.push("/admin/eventos")}
          className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-2xl bg-emerald-600 p-3 text-white">
              <Calendar className="h-6 w-6" />
            </div>
            <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              {newEventosCount}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Eventos por revisar</h3>
          <p className="mt-2 text-sm text-slate-500">Borradores o ingresos nuevos desde fuera.</p>
        </button>

        <button
          onClick={() => router.push("/admin/comercios")}
          className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-2xl bg-blue-600 p-3 text-white">
              <Store className="h-6 w-6" />
            </div>
            <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              {newComerciosCount}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Comercios por revisar</h3>
          <p className="mt-2 text-sm text-slate-500">Altas nuevas pendientes de publicar.</p>
        </button>

        <button
          onClick={() => router.push("/admin/metricas")}
          className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-2xl bg-white/10 p-3 text-white">
              <BarChart3 className="h-6 w-6" />
            </div>
            <span className="text-3xl font-semibold text-white">{totalInteractions}</span>
          </div>
          <h3 className="text-lg font-semibold text-white">Interacciones</h3>
          <p className="mt-2 text-sm text-slate-300">WhatsApp, compartir y ver más del sitio.</p>
        </button>
      </div>

      {reviewItems.length > 0 ? (
        <div className="mb-8 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-sky-50 p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
                Prioridad
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">
                Novedades para revisar primero
              </h2>
            </div>
            <div className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              {newComerciosCount + newEventosCount + newContactosCount} pendientes
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {reviewItems.map((item) => (
              <button
                key={item.id}
                onClick={item.action}
                className="rounded-2xl border border-white bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">{item.title}</span>
                  <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-rose-600 px-3 py-1 text-sm font-semibold text-white">
                    {item.value}
                  </span>
                </div>
                <p className="mb-4 text-sm text-slate-500">{item.helper}</p>
                <span className="text-sm font-semibold text-blue-600">{item.actionLabel}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <button
              key={stat.id}
              onClick={stat.action}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className={`${stat.color} rounded-xl p-3 text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-2xl font-semibold text-slate-900">{stat.value}</span>
              </div>
              <h3 className="text-sm text-slate-500">{stat.title}</h3>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Resumen general</h2>
                <p className="text-sm text-slate-500">
                  Estado del contenido y de la gestión interna.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="text-sm text-slate-500">Contenido cargado</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{totalContentCount}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="text-sm text-slate-500">Usuarios registrados</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{usuariosCount}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="text-sm text-slate-500">Contactos totales</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{contactosCount}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Próximos eventos</h2>
                <p className="text-sm text-slate-500">Lo siguiente que ya está activo en el sitio.</p>
              </div>
              <Link
                href="/admin/eventos"
                className="text-sm font-medium text-blue-600 transition hover:text-blue-500"
              >
                Ver todos
              </Link>
            </div>

            <div className="space-y-4">
              {proximosEventos.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  No hay eventos cargados todavía.
                </div>
              ) : (
                proximosEventos.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4"
                  >
                    <div className="rounded-2xl bg-blue-600 p-2 text-white">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{event.titulo}</h4>
                      <p className="text-sm text-slate-500">
                        {formatEventDateRange(event.fecha, event.fecha_fin)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Interacciones rápidas</h2>
                <p className="text-sm text-slate-500">
                  Resumen simple de lo que hace la gente en el sitio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/admin/metricas")}
                className="text-sm font-medium text-blue-600 transition hover:text-blue-500"
              >
                Abrir métricas
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-green-50 p-5">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  WhatsApp
                </div>
                <div className="text-3xl font-semibold text-slate-900">
                  {whatsappTotals.comercios + whatsappTotals.servicios + whatsappTotals.cursos}
                </div>
              </div>
              <div className="rounded-2xl bg-violet-50 p-5">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                  <Share2 className="h-4 w-4 text-violet-600" />
                  Compartir
                </div>
                <div className="text-3xl font-semibold text-slate-900">
                  {shareTotals.comercios + shareTotals.eventos + shareTotals.cursos + shareTotals.servicios}
                </div>
              </div>
              <div className="rounded-2xl bg-sky-50 p-5">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="h-4 w-4 text-sky-600" />
                  Ver más
                </div>
                <div className="text-3xl font-semibold text-slate-900">
                  {viewMoreTotals.comercios + viewMoreTotals.eventos + viewMoreTotals.cursos + viewMoreTotals.servicios + viewMoreTotals.instituciones}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold text-slate-900">Acciones rápidas</h2>
            <div className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    onClick={action.action}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition ${action.className}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{action.label}</span>
                  </button>
                )
              })}

              <Link
                href="/"
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 transition hover:bg-slate-100"
              >
                <Store className="h-5 w-5" />
                <span>Ver sitio público</span>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold text-slate-900">Actividad por canal</h2>
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 text-sm text-slate-500">WhatsApp por sección</div>
                <div className="grid grid-cols-3 gap-3 text-sm text-slate-700">
                  <div>Comercios: <span className="font-semibold">{whatsappTotals.comercios}</span></div>
                  <div>Servicios: <span className="font-semibold">{whatsappTotals.servicios}</span></div>
                  <div>Cursos: <span className="font-semibold">{whatsappTotals.cursos}</span></div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 text-sm text-slate-500">Compartidos por sección</div>
                <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                  <div>Comercios: <span className="font-semibold">{shareTotals.comercios}</span></div>
                  <div>Eventos: <span className="font-semibold">{shareTotals.eventos}</span></div>
                  <div>Cursos: <span className="font-semibold">{shareTotals.cursos}</span></div>
                  <div>Servicios: <span className="font-semibold">{shareTotals.servicios}</span></div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 text-sm text-slate-500">Ver más por sección</div>
                <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                  <div>Comercios: <span className="font-semibold">{viewMoreTotals.comercios}</span></div>
                  <div>Eventos: <span className="font-semibold">{viewMoreTotals.eventos}</span></div>
                  <div>Cursos: <span className="font-semibold">{viewMoreTotals.cursos}</span></div>
                  <div>Servicios: <span className="font-semibold">{viewMoreTotals.servicios}</span></div>
                  <div>Instituciones: <span className="font-semibold">{viewMoreTotals.instituciones}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
