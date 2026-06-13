import { supabase } from "../supabase"

const SWEEPSTAKES_CONFIG_TABLE = "sorteo_popup_config"
const SWEEPSTAKES_ENTRIES_TABLE = "sorteo_participaciones"

export type SweepstakesParticipantType = "comercio" | "servicio" | "institucion"

type SweepstakesConfigRow = {
  id: number
  titulo: string | null
  activo: boolean | null
  mostrar_popup_home?: boolean | null
  descripcion: string | null
  boton_texto?: string | null
  visible_desde?: string | null
  visible_hasta?: string | null
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

type HomeBubbleRow = {
  id: number
  burbuja_home_activa?: boolean | null
  burbuja_home_titulo?: string | null
  burbuja_home_texto?: string | null
  burbuja_home_visible_desde?: string | null
  burbuja_home_visible_hasta?: string | null
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
  buttonText: string
  participants: SweepstakesParticipant[]
}

export type SweepstakesEntrySource = "corazones" | "qr" | "web"

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

async function buildSweepstakesConfigFromRow(
  row: SweepstakesConfigRow | null
) {
  if (!row?.activo) {
    return { config: null as SweepstakesConfig | null, error: null }
  }

  const baseTitle = row.titulo?.trim() || "Como participar"
  const baseDescription = row.descripcion?.trim() || ""
  const title = baseTitle
  const description = baseDescription

  if (!description) {
    return { config: null as SweepstakesConfig | null, error: null }
  }

  const now = Date.now()
  const visibleFrom = row.visible_desde ? Date.parse(row.visible_desde) : null
  const visibleUntil = row.visible_hasta ? Date.parse(row.visible_hasta) : null

  if (
    (visibleFrom !== null && !Number.isNaN(visibleFrom) && visibleFrom > now) ||
    (visibleUntil !== null && !Number.isNaN(visibleUntil) && visibleUntil < now)
  ) {
    return { config: null as SweepstakesConfig | null, error: null }
  }

  const participantRefs = normalizeParticipantRefs(row)

  if (participantRefs.length === 0) {
    return {
      config: {
        id: row.id,
        title,
        description,
        buttonText: row.boton_texto?.trim() || "Entendido",
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
      title,
      description,
      buttonText: row.boton_texto?.trim() || "Entendido",
      participants: participantRefs
        .map((item) => participantMap.get(`${item.type}:${item.id}`))
        .filter(Boolean) as SweepstakesParticipant[],
    },
    error: null,
  }
}

export async function fetchSweepstakesConfig() {
  const fullSelect =
    "id, titulo, activo, descripcion, boton_texto, visible_desde, visible_hasta, participante_tipo_1, participante_id_1, participante_tipo_2, participante_id_2, comercio_id_1, comercio_id_2, updated_at"
  const legacySelect =
    "id, titulo, activo, descripcion, participante_tipo_1, participante_id_1, participante_tipo_2, participante_id_2, comercio_id_1, comercio_id_2, updated_at"
  let result: any = await supabase
    .from(SWEEPSTAKES_CONFIG_TABLE)
    .select(fullSelect)
    .eq("activo", true)
    .order("updated_at", { ascending: false })
    .limit(1)

  if (result.error?.code === "42703") {
    result = await supabase
      .from(SWEEPSTAKES_CONFIG_TABLE)
      .select(legacySelect)
      .eq("activo", true)
      .order("updated_at", { ascending: false })
      .limit(1)
  }

  const { data, error } = result

  if (error) {
    if (!isMissingSweepstakesSchemaError(error)) {
      console.error("No se pudo cargar la configuracion del sorteo:", error)
    }

    return { config: null as SweepstakesConfig | null, error }
  }

  const row = ((data || []) as SweepstakesConfigRow[])[0] || null
  return buildSweepstakesConfigFromRow(row)
}

export async function fetchHomeSweepstakesPopupConfig() {
  const fullSelect =
    "id, burbuja_home_activa, burbuja_home_titulo, burbuja_home_texto, burbuja_home_visible_desde, burbuja_home_visible_hasta"
  const result = await supabase
    .from("sitio")
    .select(fullSelect)
    .eq("id", 1)
    .maybeSingle()

  const { data, error } = result

  if (error) {
    if (!isMissingSweepstakesSchemaError(error)) {
      console.error("No se pudo cargar la burbuja informativa de la Home:", error)
    }

    return { config: null as SweepstakesConfig | null, error }
  }

  const row = (data as HomeBubbleRow | null) || null

  if (!row?.burbuja_home_activa) {
    return { config: null as SweepstakesConfig | null, error: null }
  }

  const title = row.burbuja_home_titulo?.trim() || "Como participar"
  const description = row.burbuja_home_texto?.trim() || ""

  if (!description) {
    return { config: null as SweepstakesConfig | null, error: null }
  }

  const now = Date.now()
  const visibleFrom = row.burbuja_home_visible_desde
    ? Date.parse(row.burbuja_home_visible_desde)
    : null
  const visibleUntil = row.burbuja_home_visible_hasta
    ? Date.parse(row.burbuja_home_visible_hasta)
    : null

  if (
    (visibleFrom !== null && !Number.isNaN(visibleFrom) && visibleFrom > now) ||
    (visibleUntil !== null && !Number.isNaN(visibleUntil) && visibleUntil < now)
  ) {
    return { config: null as SweepstakesConfig | null, error: null }
  }

  return {
    config: {
      id: row.id,
      title,
      description,
      buttonText: "Entendido",
      participants: [],
    },
    error: null,
  }
}

export async function fetchSweepstakesConfigById(sorteoId: number) {
  const fullSelect =
    "id, titulo, activo, descripcion, boton_texto, visible_desde, visible_hasta, participante_tipo_1, participante_id_1, participante_tipo_2, participante_id_2, comercio_id_1, comercio_id_2, updated_at"
  const legacySelect =
    "id, titulo, activo, descripcion, participante_tipo_1, participante_id_1, participante_tipo_2, participante_id_2, comercio_id_1, comercio_id_2, updated_at"
  let result: any = await supabase
    .from(SWEEPSTAKES_CONFIG_TABLE)
    .select(fullSelect)
    .eq("id", sorteoId)
    .maybeSingle()

  if (result.error?.code === "42703") {
    result = await supabase
      .from(SWEEPSTAKES_CONFIG_TABLE)
      .select(legacySelect)
      .eq("id", sorteoId)
      .maybeSingle()
  }

  const { data, error } = result

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
  source: SweepstakesEntrySource
}) {
  if (params.totalLikes < 3) {
    return {
      status: "error" as const,
      error: { message: "Necesitas al menos 3 corazones para participar." },
    }
  }

  const entryPayload = {
    sorteo_id: params.sorteoId,
    browser_key: params.browserKey,
    nombre: params.nombre.trim(),
    telefono: params.telefono.trim(),
    total_likes: params.totalLikes,
    origen: params.source,
  }

  const { error } = await supabase
    .from(SWEEPSTAKES_ENTRIES_TABLE)
    .insert([entryPayload])

  if (error?.code === "42703") {
    const payloadWithoutSource: Omit<typeof entryPayload, "origen"> = {
      sorteo_id: entryPayload.sorteo_id,
      browser_key: entryPayload.browser_key,
      nombre: entryPayload.nombre,
      telefono: entryPayload.telefono,
      total_likes: entryPayload.total_likes,
    }
    const fallback = await supabase
      .from(SWEEPSTAKES_ENTRIES_TABLE)
      .insert([payloadWithoutSource])

    if (!fallback.error) {
      return { status: "created" as const, error: null }
    }

    if (!isMissingSweepstakesSchemaError(fallback.error)) {
      console.error("No se pudo guardar la participacion del sorteo:", fallback.error)
    }

    return { status: "error" as const, error: fallback.error }
  }

  if (error) {
    if (!isMissingSweepstakesSchemaError(error)) {
      console.error("No se pudo guardar la participacion del sorteo:", error)
    }

    return { status: "error" as const, error }
  }

  return { status: "created" as const, error: null }
}
