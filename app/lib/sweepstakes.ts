import { supabase } from "../supabase"

const SWEEPSTAKES_CONFIG_TABLE = "sorteo_popup_config"
const SWEEPSTAKES_ENTRIES_TABLE = "sorteo_participaciones"

type SweepstakesConfigRow = {
  id: number
  activo: boolean | null
  descripcion: string | null
  comercio_id_1: number | null
  comercio_id_2: number | null
}

type SweepstakesCommerceRow = {
  id: number
  nombre: string
  imagen: string | null
  imagen_url?: string | null
}

export type SweepstakesCommerce = {
  id: number
  nombre: string
  imageSrc: string | null
  href: string
}

export type SweepstakesConfig = {
  description: string
  commerces: SweepstakesCommerce[]
}

type SweepstakesEntryRow = {
  id: number
}

type SupabaseErrorLike = {
  code?: string
  message?: string
}

export function isMissingSweepstakesSchemaError(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "42P01"
}

export async function fetchSweepstakesConfig() {
  const { data, error } = await supabase
    .from(SWEEPSTAKES_CONFIG_TABLE)
    .select("id, activo, descripcion, comercio_id_1, comercio_id_2")
    .eq("id", 1)
    .maybeSingle()

  if (error) {
    if (!isMissingSweepstakesSchemaError(error)) {
      console.error("No se pudo cargar la configuración del sorteo:", error)
    }

    return { config: null as SweepstakesConfig | null, error }
  }

  const row = data as SweepstakesConfigRow | null
  if (!row?.activo || !row.descripcion?.trim()) {
    return { config: null as SweepstakesConfig | null, error: null }
  }

  const commerceIds = [row.comercio_id_1, row.comercio_id_2].filter(
    (value): value is number => Boolean(value)
  )

  if (commerceIds.length === 0) {
    return {
      config: {
        description: row.descripcion.trim(),
        commerces: [],
      },
      error: null,
    }
  }

  const { data: commerceRows, error: commerceError } = await supabase
    .from("comercios")
    .select("id, nombre, imagen, imagen_url")
    .in("id", commerceIds)

  if (commerceError) {
    console.error("No se pudieron cargar los comercios del sorteo:", commerceError)
  }

  const commerceMap = new Map(
    ((commerceRows || []) as SweepstakesCommerceRow[]).map((commerce) => [
      commerce.id,
      {
        id: commerce.id,
        nombre: commerce.nombre,
        imageSrc: commerce.imagen_url || commerce.imagen || null,
        href: `/comercios/${commerce.id}`,
      },
    ])
  )

  return {
    config: {
      description: row.descripcion.trim(),
      commerces: commerceIds
        .map((commerceId) => commerceMap.get(commerceId))
        .filter(Boolean) as SweepstakesCommerce[],
    },
    error: null,
  }
}

export async function hasSweepstakesEntry(browserKey: string) {
  const { data, error } = await supabase
    .from(SWEEPSTAKES_ENTRIES_TABLE)
    .select("id")
    .eq("browser_key", browserKey)
    .maybeSingle()

  if (error) {
    if (!isMissingSweepstakesSchemaError(error)) {
      console.error("No se pudo verificar la participación del sorteo:", error)
    }

    return { exists: false, error }
  }

  return {
    exists: Boolean((data as SweepstakesEntryRow | null)?.id),
    error: null,
  }
}

export async function createSweepstakesEntry(params: {
  browserKey: string
  nombre: string
  telefono: string
  totalLikes: number
}) {
  const { error } = await supabase.from(SWEEPSTAKES_ENTRIES_TABLE).insert([
    {
      browser_key: params.browserKey,
      nombre: params.nombre.trim(),
      telefono: params.telefono.trim(),
      total_likes: params.totalLikes,
    },
  ])

  if (error) {
    if (error.code === "23505") {
      return { status: "exists" as const }
    }

    if (!isMissingSweepstakesSchemaError(error)) {
      console.error("No se pudo guardar la participación del sorteo:", error)
    }

    return { status: "error" as const, error }
  }

  return { status: "created" as const, error: null }
}
