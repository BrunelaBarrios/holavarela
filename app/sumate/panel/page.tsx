'use client'

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type { User } from "@supabase/supabase-js"
import {
  CalendarDays,
  CircleCheckBig,
  Clock3,
  ExternalLink,
  FilePenLine,
  ImageIcon,
  LogOut,
  MapPin,
  MessageSquareText,
  Phone,
  Sparkles,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthFormStatus } from "../../components/AuthFormStatus"
import {
  entityLabels,
  entityStatusCopy,
  fetchOwnedEvents,
  findOwnedEntity,
  normalizeEntityStatus,
  type OwnedEntity,
  type OwnedEvent,
} from "../../lib/sumateOwner"
import { supabase } from "../../supabase"

function formatEventState(status?: string | null) {
  const normalized = normalizeEntityStatus(status)
  if (normalized === "borrador") return "Borrador"
  if (normalized === "oculto") return "Oculto"
  return "Publicado"
}

function getStatusStyles(status: "activo" | "borrador" | "oculto") {
  if (status === "borrador") {
    return {
      badge: "bg-amber-100 text-amber-800",
      panel: "border-amber-200 bg-amber-50/70",
      accent: "text-amber-700",
    }
  }

  if (status === "oculto") {
    return {
      badge: "bg-slate-200 text-slate-700",
      panel: "border-slate-200 bg-slate-100",
      accent: "text-slate-700",
    }
  }

  return {
    badge: "bg-emerald-100 text-emerald-800",
    panel: "border-emerald-200 bg-emerald-50/70",
    accent: "text-emerald-700",
  }
}

function buildProfileFields(ownedEntity: OwnedEntity | null) {
  if (!ownedEntity) return []

  return [
    ownedEntity.record.direccion
      ? { label: "Direccion", value: ownedEntity.record.direccion, icon: MapPin }
      : null,
    ownedEntity.record.telefono || ownedEntity.record.contacto
      ? {
          label: "Contacto",
          value: ownedEntity.record.telefono || ownedEntity.record.contacto || "",
          icon: Phone,
        }
      : null,
    ownedEntity.record.responsable
      ? { label: "Responsable", value: ownedEntity.record.responsable, icon: MessageSquareText }
      : null,
    ownedEntity.record.categoria
      ? { label: "Categoria", value: ownedEntity.record.categoria, icon: Sparkles }
      : null,
  ].filter(Boolean) as Array<{
    label: string
    value: string
    icon: typeof MapPin
  }>
}

function getNextStepText(params: { isInstitution: boolean; status: "activo" | "borrador" | "oculto" }) {
  if (params.status === "borrador") {
    return params.isInstitution
      ? "Tu perfil institucional ya quedo vinculado. Puedes completar mejor la descripcion y sumar eventos."
      : "Tu suscripcion esta en revision. Mientras tanto puedes completar mejor tu perfil y cargar eventos."
  }

  if (params.status === "oculto") {
    return "Tu perfil esta pausado. Puedes seguir editando informacion y pedir publicacion desde admin."
  }

  return params.isInstitution
    ? "Tu institucion ya esta conectada. Aprovecha el panel para mantener los datos actualizados y compartir actividades."
    : "Tu suscripcion ya esta activa. Ahora puedes usar este panel para mantener tu perfil vivo y sumar novedades."
}

export default function SumatePanelPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [ownedEntity, setOwnedEntity] = useState<OwnedEntity | null>(null)
  const [events, setEvents] = useState<OwnedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadPanel = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.email) {
        router.replace("/sumate/login")
        return
      }

      try {
        const [entity, ownEvents] = await Promise.all([
          findOwnedEntity(session.user.email),
          fetchOwnedEvents(session.user.email),
        ])

        if (!entity) {
          router.replace("/sumate/alta")
          return
        }

        setUser(session.user)
        setOwnedEntity(entity)
        setEvents(ownEvents)
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No pudimos cargar tu panel en este momento."
        )
      } finally {
        setLoading(false)
      }
    }

    void loadPanel()
  }, [router])

  const handleLogout = async () => {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError("No pudimos cerrar la sesion. Proba de nuevo.")
      return
    }

    router.push("/sumate")
    router.refresh()
  }

  const statusKey = normalizeEntityStatus(ownedEntity?.record.estado)
  const statusMeta = entityStatusCopy[statusKey]
  const statusStyles = getStatusStyles(statusKey)
  const isInstitution = ownedEntity?.type === "institucion"
  const imageSrc =
    ownedEntity?.record.imagen_url ||
    ownedEntity?.record.imagen ||
    ownedEntity?.record.foto ||
    null

  const profileFields = useMemo(() => buildProfileFields(ownedEntity), [ownedEntity])
  const publishedEvents = events.filter((event) => normalizeEntityStatus(event.estado) === "activo").length
  const draftEvents = events.filter((event) => normalizeEntityStatus(event.estado) === "borrador").length

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef7f2_45%,#ffffff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {loading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.3)]">
            Cargando tu panel...
          </div>
        ) : (
          <div className="space-y-6">
            {error ? <AuthFormStatus tone="error" message={error} /> : null}

            <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
              <div className="grid lg:grid-cols-[1.35fr_0.9fr]">
                <div className="bg-[radial-gradient(circle_at_top_left,#d7f0db_0%,#e9f7ef_35%,#edf5ff_100%)] px-6 py-8 sm:px-8 sm:py-10">
                  <div className="inline-flex rounded-full bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    Panel privado
                  </div>

                  <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
                    <div className="max-w-2xl">
                      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                        {ownedEntity ? entityLabels[ownedEntity.type] : "Perfil"}
                      </p>
                      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                        {ownedEntity?.record.nombre}
                      </h1>
                      <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
                        {getNextStepText({ isInstitution, status: statusKey })}
                      </p>
                      <p className="mt-4 text-sm text-slate-500">{user?.email}</p>
                    </div>

                    <div className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${statusStyles.badge}`}>
                      {statusMeta.label}
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Estado
                      </div>
                      <div className={`mt-3 text-2xl font-semibold ${statusStyles.accent}`}>{statusMeta.label}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{statusMeta.description}</p>
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Eventos
                      </div>
                      <div className="mt-3 text-3xl font-semibold text-slate-950">{events.length}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {draftEvents} en borrador y {publishedEvents} publicados.
                      </p>
                    </div>

                    <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Perfil
                      </div>
                      <div className="mt-3 text-2xl font-semibold text-slate-950">
                        {profileFields.length > 2 ? "Completo" : "En progreso"}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {profileFields.length > 2
                          ? "Tu ficha ya tiene buena base de informacion."
                          : "Aun puedes sumar mas datos para que se vea mejor."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-8 sm:px-8 sm:py-10">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Acciones rapidas
                    </div>
                    <div className="mt-5 grid gap-3">
                      <Link
                        href="/sumate/perfil"
                        className="group flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 transition hover:border-blue-300 hover:bg-blue-50/60"
                      >
                        <div>
                          <div className="text-base font-semibold text-slate-900">Editar mi perfil</div>
                          <div className="mt-1 text-sm text-slate-500">Actualiza descripcion, imagen y datos de contacto.</div>
                        </div>
                        <FilePenLine className="h-5 w-5 text-slate-400 transition group-hover:text-blue-600" />
                      </Link>

                      <Link
                        href="/sumate/eventos/nuevo"
                        className="group flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 transition hover:border-emerald-300 hover:bg-emerald-50/60"
                      >
                        <div>
                          <div className="text-base font-semibold text-slate-900">Agregar evento</div>
                          <div className="mt-1 text-sm text-slate-500">Publica actividades, promos o sorteos desde tu panel.</div>
                        </div>
                        <CalendarDays className="h-5 w-5 text-slate-400 transition group-hover:text-emerald-600" />
                      </Link>

                      <Link
                        href="/"
                        className="group flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <div>
                          <div className="text-base font-semibold text-slate-900">Ver sitio publico</div>
                          <div className="mt-1 text-sm text-slate-500">Revisa como se ve Hola Varela para los visitantes.</div>
                        </div>
                        <ExternalLink className="h-5 w-5 text-slate-400 transition group-hover:text-slate-700" />
                      </Link>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesion
                  </button>
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="space-y-6">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-950">Resumen del perfil</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Esta es la informacion principal vinculada a tu cuenta.
                      </p>
                    </div>

                    <div className={`rounded-full px-4 py-2 text-sm font-semibold ${statusStyles.badge}`}>
                      {ownedEntity ? entityLabels[ownedEntity.type] : "Perfil"}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {profileFields.length > 0 ? (
                      profileFields.map((field) => {
                        const Icon = field.icon
                        return (
                          <div key={field.label} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                            <div className="flex items-center gap-3">
                              <div className="rounded-2xl bg-white p-3 shadow-sm">
                                <Icon className="h-4 w-4 text-slate-500" />
                              </div>
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                  {field.label}
                                </div>
                                <div className="mt-1 text-sm leading-6 text-slate-700">{field.value}</div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="sm:col-span-2 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
                        Todavia faltan datos visibles en tu perfil. Puedes completarlos desde el boton de editar perfil.
                      </div>
                    )}
                  </div>

                  <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Descripcion
                    </div>
                    <div className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                      {ownedEntity?.record.descripcion?.trim()
                        ? ownedEntity.record.descripcion
                        : "Aun no agregaste una descripcion. Una buena descripcion ayuda a que el perfil se vea mas completo y profesional."}
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-950">Eventos cargados</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Gestiona tus actividades y revisa en que estado esta cada una.
                      </p>
                    </div>

                    <Link
                      href="/sumate/eventos/nuevo"
                      className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
                    >
                      Nuevo evento
                    </Link>
                  </div>

                  {events.length === 0 ? (
                    <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#f4faf6_100%)] p-8">
                      <div className="flex items-start gap-4">
                        <div className="rounded-[20px] bg-white p-4 shadow-sm">
                          <CalendarDays className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">Todavia no cargaste eventos</h3>
                          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
                            Puedes usar este espacio para difundir actividades, promociones, sorteos o novedades vinculadas a tu perfil.
                          </p>
                          <Link
                            href="/sumate/eventos/nuevo"
                            className="mt-5 inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                          >
                            Cargar mi primer evento
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      {events.map((event) => (
                        <article
                          key={event.id}
                          className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]"
                        >
                          {event.imagen ? (
                            <img src={event.imagen} alt={event.titulo} className="h-44 w-full object-cover" />
                          ) : (
                            <div className="flex h-44 items-center justify-center bg-slate-100">
                              <ImageIcon className="h-8 w-8 text-slate-300" />
                            </div>
                          )}

                          <div className="p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900">{event.titulo}</h3>
                                <div className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                  {event.categoria || "Evento"}
                                </div>
                              </div>

                              <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                                {formatEventState(event.estado)}
                              </div>
                            </div>

                            <div className="mt-4 space-y-2 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                <span>{new Date(event.fecha).toLocaleDateString("es-UY")}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                <span>{event.ubicacion}</span>
                              </div>
                            </div>

                            <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-500">{event.descripcion}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <aside className="space-y-6">
                <div className={`rounded-[32px] border p-6 shadow-sm ${statusStyles.panel}`}>
                  <div className="flex items-start gap-4">
                    <div className="rounded-[22px] bg-white/80 p-4">
                      {statusKey === "activo" ? (
                        <CircleCheckBig className={`h-6 w-6 ${statusStyles.accent}`} />
                      ) : (
                        <Clock3 className={`h-6 w-6 ${statusStyles.accent}`} />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Estado actual
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-slate-950">{statusMeta.label}</div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{statusMeta.description}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Siguientes pasos
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="flex gap-3">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <div>
                        <div className="font-medium text-slate-900">Revisa la informacion del perfil</div>
                        <div className="mt-1 text-sm leading-6 text-slate-500">
                          Asegurate de que nombre, imagen y descripcion representen bien tu espacio.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <div>
                        <div className="font-medium text-slate-900">Agrega al menos un evento</div>
                        <div className="mt-1 text-sm leading-6 text-slate-500">
                          Los eventos ayudan a mantener el perfil activo y darle movimiento a la publicacion.
                        </div>
                      </div>
                    </div>

                    {!isInstitution ? (
                      <div className="flex gap-3">
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <div>
                          <div className="font-medium text-slate-900">Sigue tu suscripcion</div>
                          <div className="mt-1 text-sm leading-6 text-slate-500">
                            Desde este panel vas a poder ver si ya esta activa, en revision o pausada.
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {imageSrc ? (
                  <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
                    <img src={imageSrc} alt={ownedEntity?.record.nombre || "Perfil"} className="h-72 w-full object-cover" />
                  </div>
                ) : (
                  <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-8 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="rounded-[20px] bg-slate-100 p-4">
                        <ImageIcon className="h-6 w-6 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Falta una imagen principal</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-500">
                          Una buena imagen mejora mucho la presentacion del perfil. Puedes subirla desde editar perfil.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
