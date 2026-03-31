'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { AccessPageShell } from "../../components/AccessPageShell"
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

function getStatusPanelClass(status: "activo" | "borrador" | "oculto") {
  if (status === "borrador") return "border-amber-200 bg-amber-50/70"
  if (status === "oculto") return "border-slate-200 bg-slate-100"
  return "border-emerald-200 bg-emerald-50/70"
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
  const isInstitution = ownedEntity?.type === "institucion"
  const imageSrc =
    ownedEntity?.record.imagen_url ||
    ownedEntity?.record.imagen ||
    ownedEntity?.record.foto ||
    null

  return (
    <AccessPageShell
      eyebrow="Mi panel"
      title="Gestiona tu espacio"
      description="Desde aca puedes revisar el estado de tu perfil, editar tus datos y cargar eventos para Hola Varela."
      secondaryLink={{ href: "/", label: "Volver al inicio" }}
    >
      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
          Cargando tu panel...
        </div>
      ) : (
        <div className="space-y-6">
          {error ? <AuthFormStatus tone="error" message={error} /> : null}

          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                    {ownedEntity ? entityLabels[ownedEntity.type] : "Perfil"}
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold text-slate-900">
                    {ownedEntity?.record.nombre}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">{user?.email}</p>
                </div>

                <div className={`rounded-full px-4 py-2 text-sm font-semibold ${statusMeta.badge}`}>
                  {statusMeta.label}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {ownedEntity?.record.direccion ? (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Direccion
                    </div>
                    <div className="mt-2 text-sm text-slate-700">{ownedEntity.record.direccion}</div>
                  </div>
                ) : null}

                {(ownedEntity?.record.telefono || ownedEntity?.record.contacto) ? (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Contacto
                    </div>
                    <div className="mt-2 text-sm text-slate-700">
                      {ownedEntity?.record.telefono || ownedEntity?.record.contacto}
                    </div>
                  </div>
                ) : null}

                {ownedEntity?.record.responsable ? (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Responsable
                    </div>
                    <div className="mt-2 text-sm text-slate-700">{ownedEntity.record.responsable}</div>
                  </div>
                ) : null}

                {ownedEntity?.record.categoria ? (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Categoria
                    </div>
                    <div className="mt-2 text-sm text-slate-700">{ownedEntity.record.categoria}</div>
                  </div>
                ) : null}
              </div>

              {ownedEntity?.record.descripcion ? (
                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Descripcion
                  </div>
                  <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                    {ownedEntity.record.descripcion}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/sumate/perfil"
                  className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
                >
                  Editar mi perfil
                </Link>

                <Link
                  href="/sumate/eventos/nuevo"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Agregar evento
                </Link>

                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Cerrar sesion
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {!isInstitution ? (
                <div className={`rounded-[28px] border p-6 shadow-sm ${getStatusPanelClass(statusKey)}`}>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Estado de suscripcion
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-slate-900">{statusMeta.label}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{statusMeta.description}</p>
                </div>
              ) : null}

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Tus eventos
                </div>
                <div className="mt-3 text-3xl font-semibold text-slate-900">{events.length}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Los eventos que cargues desde este panel entran como borrador hasta publicarlos desde admin.
                </p>
              </div>

              {imageSrc ? (
                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <img src={imageSrc} alt={ownedEntity?.record.nombre || "Perfil"} className="h-56 w-full object-cover" />
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">Eventos cargados</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Aqui ves los eventos vinculados a tu cuenta.
                </p>
              </div>

              <Link
                href="/sumate/eventos/nuevo"
                className="inline-flex items-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Nuevo evento
              </Link>
            </div>

            {events.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Todavia no cargaste eventos desde tu panel.
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {events.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-slate-900">{event.titulo}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {new Date(event.fecha).toLocaleDateString("es-UY")}
                        </div>
                      </div>

                      <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatEventState(event.estado)}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-slate-600">{event.ubicacion}</div>
                    <div className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{event.descripcion}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AccessPageShell>
  )
}
