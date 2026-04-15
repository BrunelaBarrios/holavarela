import { supabase } from "../supabase"

const SWEEPSTAKES_CONFIG_TABLE = "sorteo_popup_config"
const SWEEPSTAKES_ENTRIES_TABLE = "sorteo_participaciones"

export type SweepstakesParticipantType = "comercio" | "servicio" | "institucion"

type SweepstakesConfigRow = {
  id: number
  titulo: string | null
  activo: boolean | null
  descripcion: string | null
  participante_tipo_1?: SweepstakesParticipantType | null
  participante_id_1?: number | null
  participante_tipo_2?: SweepstakesParticipantType | null
  participante_id_2?: number | null
  comercio_id_1: number | null
  comercio_id_2: number | null
  updated_at?: string | null
}

type SweepstakesEntityRow = {
  id: number
  nombre: string
  imagen?: string | null
  imagen_url?: string | null
  foto?: string | null
}

export type SweepstakesParticipant = {
  id: number
  type: SweepstakesParticipantType
  nombre: string
  imageSrc: string | null
  href: string
}

export type SweepstakesConfig = {
  id: number
  title: string
  description: string
  participants: SweepstakesParticipant[]
}

type SupabaseErrorLike = {
  code?: string
  message?: string
}

export function isMissingSweepstakesSchemaError(
  error: SupabaseErrorLike | null | undefined
) {
  return error?.code === "42P01" || error?.code === "42703"
}

function normalizeParticipantRefs(row: SweepstakesConfigRow) {
  const refs = [
    row.participante_tipo_1 && row.participante_id_1
      ? { type: row.participante_tipo_1, id: row.participante_id_1 }
      : row.comercio_id_1
        ? { type: "comercio" as const, id: row.comercio_id_1 }
        : null,
    row.participante_tipo_2 && row.participante_id_2
      ? { type: row.participante_tipo_2, id: row.participante_id_2 }
      : row.comercio_id_2
        ? { type: "comercio" as const, id: row.comercio_id_2 }
        : null,
  ].filter(Boolean) as Array<{ type: SweepstakesParticipantType; id: number }>

  return refs.filter(
    (ref, index, current) =>
      current.findIndex((item) => item.type === ref.type && item.id === ref.id) === index
  )
}

async function buildSweepstakesConfigFromRow(row: SweepstakesConfigRow | null) {
  if (!row?.activo || !row.descripcion?.trim()) {
    return { config: null as SweepstakesConfig | null, error: null }
  }

  const participantRefs = normalizeParticipantRefs(row)

  if (participantRefs.length === 0) {
    return {
      config: {
        id: row.id,
        title: row.titulo?.trim() || "Participa con tus corazones",
        description: row.descripcion.trim(),
        participants: [],
      },
      error: null,
    }
  }

  const commerceIds = participantRefs
    .filter((item) => item.type === "comercio")
    .map((item) => item.id)

  const serviceIds = participantRefs
    .filter((item) => item.type === "servicio")
    .map((item) => item.id)

  const institutionIds = participantRefs
    .filter((item) => item.type === "institucion")
    .map((item) => item.id)

  const [
    { data: commerceRows, error: commerceError },
    { data: serviceRows, error: serviceError },
    { data: institutionRows, error: institutionError },
  ] = await Promise.all([
    commerceIds.length
      ? supabase
          .from("comercios")
          .select("id, nombre, imagen, imagen_url")
          .in("id", commerceIds)
      : Promise.resolve({ data: [], error: null }),
    serviceIds.length
      ? supabase
          .from("servicios")
          .select("id, nombre, imagen")
          .in("id", serviceIds)
      : Promise.resolve({ data: [], error: null }),
    institutionIds.length
      ? supabase
          .from("instituciones")
          .select("id, nombre, foto")
          .in("id", institutionIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (commerceError) {
    console.error("No se pudieron cargar los comercios del sorteo:", commerceError)
  }

  if (serviceError) {
    console.error("No se pudieron cargar los servicios del sorteo:", serviceError)
  }

  if (institutionError) {
    console.error("No se pudieron cargar las instituciones del sorteo:", institutionError)
  }

  const participantMap = new Map<string, SweepstakesParticipant>()

  ;((commerceRows || []) as SweepstakesEntityRow[]).forEach((commerce) => {
    participantMap.set(`comercio:${commerce.id}`, {
      id: commerce.id,
      type: "comercio",
      nombre: commerce.nombre,
      imageSrc: commerce.imagen_url || commerce.imagen || null,
      href: `/comercios/${commerce.id}`,
    })
  })

  ;((serviceRows || []) as SweepstakesEntityRow[]).forEach((service) => {
    participantMap.set(`servicio:${service.id}`, {
      id: service.id,
      type: "servicio",
      nombre: service.nombre,
      imageSrc: service.imagen || null,
      href: `/servicios/${service.id}`,
    })
  })

  ;((institutionRows || []) as SweepstakesEntityRow[]).forEach((institution) => {
    participantMap.set(`institucion:${institution.id}`, {
      id: institution.id,
      type: "institucion",
      nombre: institution.nombre,
      imageSrc: institution.foto || null,
      href: `/instituciones/${institution.id}`,
    })
  })

  return {
    config: {
      id: row.id,
      title: row.titulo?.trim() || "Participa con tus corazones",
      description: row.descripcion.trim(),
      participants: participantRefs
        .map((item) => participantMap.get(`${item.type}:${item.id}`))
        .filter(Boolean) as SweepstakesParticipant[],
    },
    error: null,
  }
}

export async function fetchSweepstakesConfig() {
  const { data, error } = await supabase
    .from(SWEEPSTAKES_CONFIG_TABLE)
    .select(
      "id, titulo, activo, descripcion, participante_tipo_1, participante_id_1, participante_tipo_2, participante_id_2, comercio_id_1, comercio_id_2, updated_at"
    )
    .eq("activo", true)
    .order("updated_at", { ascending: false })
    .limit(1)

  if (error) {
    if (!isMissingSweepstakesSchemaError(error)) {
      console.error("No se pudo cargar la configuracion del sorteo:", error)
    }

    return { config: null as SweepstakesConfig | null, error }
  }

  const row = ((data || []) as SweepstakesConfigRow[])[0] || null
  return buildSweepstakesConfigFromRow(row)
}

export async function fetchSweepstakesConfigById(sorteoId: number) {
  const { data, error } = await supabase
    .from(SWEEPSTAKES_CONFIG_TABLE)
    .select(
      "id, titulo, activo, descripcion, participante_tipo_1, participante_id_1, participante_tipo_2, participante_id_2, comercio_id_1, comercio_id_2, updated_at"
    )
    .eq("id", sorteoId)
    .maybeSingle()

  if (error) {
    if (!isMissingSweepstakesSchemaError(error)) {
      console.error("No se pudo cargar el sorteo:", error)
    }

    return { config: null as SweepstakesConfig | null, error }
  }

  return buildSweepstakesConfigFromRow((data as SweepstakesConfigRow | null) || null)
}

export async function createSweepstakesEntry(params: {
  sorteoId: number
  browserKey: string
  nombre: string
  telefono: string
  totalLikes: number
}) {
  if (params.totalLikes < 3) {
    return {
      status: "error" as const,
      error: { message: "Necesitas al menos 3 corazones para participar." },
    }
  }

  const { error } = await supabase
    .from(SWEEPSTAKES_ENTRIES_TABLE)
    .insert([
      {
        sorteo_id: params.sorteoId,
        browser_key: params.browserKey,
        nombre: params.nombre.trim(),
        telefono: params.telefono.trim(),
        total_likes: params.totalLikes,
      },
    ])

  if (error) {
    if (!isMissingSweepstakesSchemaError(error)) {
      console.error("No se pudo guardar la participacion del sorteo:", error)
    }

    return { status: "error" as const, error }
  }

  return { status: "created" as const, error: null }
}