'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  GraduationCap,
  Mail,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react"
import { supabase } from "../supabase"

type StatCard = {
  id: string
  title: string
  value: number
  icon: typeof Store
  color: string
  action: () => void
}

type PriorityCard = {
  id: string
  title: string
  value: number
  description: string
  icon: typeof Mail
  color: string
  action: () => void
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [comerciosCount, setComerciosCount] = useState(0)
  const [eventosCount, setEventosCount] = useState(0)
  const [serviciosCount, setServiciosCount] = useState(0)
  const [institucionesCount, setInstitucionesCount] = useState(0)
  const [cursosCount, setCursosCount] = useState(0)
  const [usuariosCount, setUsuariosCount] = useState(0)
  const [newComerciosCount, setNewComerciosCount] = useState(0)
  const [newEventosCount, setNewEventosCount] = useState(0)
  const [newContactosCount, setNewContactosCount] = useState(0)
  const [pendingSubscriptionsCount, setPendingSubscriptionsCount] = useState(0)

  useEffect(() => {
    const cargarDashboard = async () => {
      const [
        { count: comercios },
        { count: eventos },
        { count: servicios },
        { count: instituciones },
        { count: cursos },
        { count: usuarios },
        { count: newComercios },
        { count: newEventos },
        { count: newContactos },
        { count: pendingComercios },
        { count: pendingServicios },
        { count: pendingCursos },
      ] = await Promise.all([
        supabase.from("comercios").select("*", { count: "exact", head: true }),
        supabase.from("eventos").select("*", { count: "exact", head: true }),
        supabase.from("servicios").select("*", { count: "exact", head: true }),
        supabase.from("instituciones").select("*", { count: "exact", head: true }),
        supabase.from("cursos").select("*", { count: "exact", head: true }),
        supabase.from("usuarios_registrados").select("*", { count: "exact", head: true }),
        supabase.from("comercios").select("*", { count: "exact", head: true }).eq("estado", "borrador"),
        supabase.from("eventos").select("*", { count: "exact", head: true }).eq("estado", "borrador"),
        supabase
          .from("contacto_solicitudes")
          .select("*", { count: "exact", head: true })
          .or("visto.is.null,visto.eq.false"),
        supabase
          .from("comercios")
          .select("*", { count: "exact", head: true })
          .eq("estado_suscripcion", "pendiente"),
        supabase
          .from("servicios")
          .select("*", { count: "exact", head: true })
          .eq("estado_suscripcion", "pendiente"),
        supabase
          .from("cursos")
          .select("*", { count: "exact", head: true })
          .eq("estado_suscripcion", "pendiente"),
      ])

      setComerciosCount(comercios || 0)
      setEventosCount(eventos || 0)
      setServiciosCount(servicios || 0)
      setInstitucionesCount(instituciones || 0)
      setCursosCount(cursos || 0)
      setUsuariosCount(usuarios || 0)
      setNewComerciosCount(newComercios || 0)
      setNewEventosCount(newEventos || 0)
      setNewContactosCount(newContactos || 0)
      setPendingSubscriptionsCount(
        (pendingComercios || 0) + (pendingServicios || 0) + (pendingCursos || 0)
      )
      setLoading(false)
    }

    void cargarDashboard()
  }, [])

  const priorityCards: PriorityCard[] = [
    {
      id: "contactos",
      title: "Contactos pendientes",
      value: newContactosCount,
      description: "Mensajes nuevos esperando revision.",
      icon: Mail,
      color: "bg-rose-600",
      action: () => router.push("/admin/contactos"),
    },
    {
      id: "eventos",
      title: "Eventos borrador",
      value: newEventosCount,
      description: "Publicaciones listas para revisar o publicar.",
      icon: Calendar,
      color: "bg-emerald-600",
      action: () => router.push("/admin/eventos"),
    },
    {
      id: "comercios",
      title: "Comercios borrador",
      value: newComerciosCount,
      description: "Altas nuevas pendientes de publicacion.",
      icon: Store,
      color: "bg-blue-600",
      action: () => router.push("/admin/comercios"),
    },
    {
      id: "suscripciones",
      title: "Suscripciones pendientes",
      value: pendingSubscriptionsCount,
      description: "Fichas esperando confirmacion o seguimiento.",
      icon: CreditCard,
      color: "bg-slate-800",
      action: () => router.push("/admin/suscripciones"),
    },
  ]

  const stats: StatCard[] = [
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

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">
            Un panel mas simple para resolver rapido lo importante.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin/metricas")}
          className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
        >
          <BarChart3 className="h-4 w-4" />
          Ver metricas completas
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
          Cargando panel...
        </div>
      ) : (
        <div className="space-y-8">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {priorityCards.map((card) => {
              const Icon = card.icon
              return (
                <button
                  key={card.id}
                  onClick={card.action}
                  className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className={`${card.color} rounded-2xl p-3 text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-3xl font-semibold text-slate-900">{card.value}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
                  <p className="mt-2 text-sm text-slate-500">{card.description}</p>
                </button>
              )
            })}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Secciones
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">Accesos principales</h2>
                <p className="text-sm text-slate-500">
                  Entra directo a cada parte del contenido sin mezclarlo con metricas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <button
                    key={stat.id}
                    onClick={stat.action}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-sm"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className={`${stat.color} rounded-xl p-3 text-white`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-2xl font-semibold text-slate-900">{stat.value}</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">{stat.title}</h3>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
