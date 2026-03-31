"use client"

import { supabase } from "../supabase"

export type OwnedEntityType = "comercio" | "servicio" | "curso" | "institucion"

export type OwnedEntityRecord = {
  id: number
  nombre: string
  descripcion?: string | null
  direccion?: string | null
  telefono?: string | null
  imagen?: string | null
  imagen_url?: string | null
  foto?: string | null
  categoria?: string | null
  responsable?: string | null
  contacto?: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
  owner_email?: string | null
}

export type OwnedEntity = {
  type: OwnedEntityType
  record: OwnedEntityRecord
}

export type OwnedEvent = {
  id: number
  titulo: string
  categoria?: string | null
  fecha: string
  fecha_fin?: string | null
  ubicacion: string
  telefono?: string | null
  descripcion: string
  imagen?: string | null
  estado?: string | null
  usa_whatsapp?: boolean | null
  owner_email?: string | null
}

const entityConfigs: Array<{
  type: OwnedEntityType
  table: "comercios" | "servicios" | "cursos" | "instituciones"
}> = [
  { type: "comercio", table: "comercios" },
  { type: "servicio", table: "servicios" },
  { type: "curso", table: "cursos" },
  { type: "institucion", table: "instituciones" },
]

export const entityLabels: Record<OwnedEntityType, string> = {
  comercio: "Comercio",
  servicio: "Servicio",
  curso: "Curso o clase",
  institucion: "Institucion",
}

export const entityStatusCopy = {
  activo: {
    label: "Activa",
    badge: "bg-emerald-100 text-emerald-700",
    description: "Tu suscripcion ya esta visible en Hola Varela.",
  },
  borrador: {
    label: "En revision",
    badge: "bg-amber-100 text-amber-700",
    description: "Recibimos tus datos y tu suscripcion sigue en revision.",
  },
  oculto: {
    label: "Pausada",
    badge: "bg-slate-200 text-slate-700",
    description: "Tu suscripcion esta guardada pero no se muestra publicamente.",
  },
} as const

export function normalizeEntityStatus(status?: string | null) {
  if (status === "oculto") return "oculto"
  if (status === "borrador") return "borrador"
  return "activo"
}

export async function findOwnedEntity(email: string): Promise<OwnedEntity | null> {
  for (const config of entityConfigs) {
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .eq("owner_email", email)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data) {
      return {
        type: config.type,
        record: data as OwnedEntityRecord,
      }
    }
  }

  return null
}

export async function fetchOwnedEvents(email: string) {
  const { data, error } = await supabase
    .from("eventos")
    .select("*")
    .eq("owner_email", email)
    .order("fecha", { ascending: false })

  if (error) {
    throw error
  }

  return (data || []) as OwnedEvent[]
}

export async function claimEntityOwnership(params: {
  type: OwnedEntityType
  entityId: number
  email: string
}) {
  const config = entityConfigs.find((item) => item.type === params.type)
  if (!config) {
    throw new Error("No pudimos identificar el tipo de registro.")
  }

  const { data, error } = await supabase
    .from(config.table)
    .select("id, owner_email")
    .eq("id", params.entityId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const currentOwner = (data as { owner_email?: string | null } | null)?.owner_email ?? null

  if (currentOwner && currentOwner !== params.email) {
    throw new Error("Este registro ya esta vinculado a otra cuenta.")
  }

  if (currentOwner === params.email) {
    return
  }

  const { error: updateError } = await supabase
    .from(config.table)
    .update({ owner_email: params.email })
    .eq("id", params.entityId)

  if (updateError) {
    throw updateError
  }
}
