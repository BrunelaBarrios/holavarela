import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { logAdminActivityServer } from "../../../../lib/adminActivityServer"
import { readAdminSessionFromRequest } from "../../../../lib/adminSession"
import {
  CHALLENGE_GAME_OPTIONS,
  DEFAULT_CHALLENGE_CONFIG,
  isMissingChallengesSchemaError,
  normalizeChallengeKeys,
  normalizeMemoryMode,
  normalizePuzzleImages,
  normalizeWordSearchWords,
} from "../../../../lib/challengeGame"
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin"

type ChallengeConfigRow = {
  activo?: boolean | null
  juegos_activos?: unknown
  sopa_palabras?: unknown
  memoria_modo?: unknown
  puzzle_imagenes?: unknown
  slug?: string | null
  titulo?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type ChallengeEdition = {
  slug: string
  titulo: string
  activo: boolean
  juegosActivos: ReturnType<typeof normalizeChallengeKeys>
  sopaPalabras: ReturnType<typeof normalizeWordSearchWords>
  memoriaModo: ReturnType<typeof normalizeMemoryMode>
  puzzleImagenes: ReturnType<typeof normalizePuzzleImages>
  createdAt: string | null
  updatedAt: string | null
}

function configFromRow(row: ChallengeConfigRow | null | undefined) {
  if (!row) return DEFAULT_CHALLENGE_CONFIG

  return {
    activo: row.activo !== false,
    juegosActivos: normalizeChallengeKeys(row.juegos_activos),
    sopaPalabras: normalizeWordSearchWords(row.sopa_palabras),
    memoriaModo: normalizeMemoryMode(row.memoria_modo),
    puzzleImagenes: normalizePuzzleImages(row.puzzle_imagenes),
    slug: row.slug || undefined,
    titulo: row.titulo || undefined,
  }
}

function editionFromRow(row: ChallengeConfigRow): ChallengeEdition | null {
  if (!row.slug) return null

  return {
    slug: row.slug,
    titulo: row.titulo || row.slug,
    activo: row.activo !== false,
    juegosActivos: normalizeChallengeKeys(row.juegos_activos),
    sopaPalabras: normalizeWordSearchWords(row.sopa_palabras),
    memoriaModo: normalizeMemoryMode(row.memoria_modo),
    puzzleImagenes: normalizePuzzleImages(row.puzzle_imagenes),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }
}

function createChallengeSlug() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)

  return `desafio-${date}-${suffix}`
}

function normalizeTitle(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback

  const normalized = value.trim().slice(0, 80)
  return normalized || fallback
}

async function requireAdminSession(request: NextRequest) {
  return readAdminSessionFromRequest(request)
}

export async function GET(request: NextRequest) {
  const session = await requireAdminSession(request)
  if (!session) {
    return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const configResult = await supabase
    .from("desafio_config")
    .select("activo, juegos_activos, sopa_palabras, memoria_modo, puzzle_imagenes, slug, titulo, updated_at")
    .eq("id", 1)
    .maybeSingle()
  let data = configResult.data as ChallengeConfigRow | null
  let error = configResult.error

  if (
    error?.code === "42703" &&
    (error.message?.includes("memoria_modo") ||
      error.message?.includes("sopa_palabras") ||
      error.message?.includes("puzzle_imagenes"))
  ) {
    const fallback = await supabase
      .from("desafio_config")
      .select("activo, juegos_activos, slug, titulo, updated_at")
      .eq("id", 1)
      .maybeSingle()
    data = fallback.data as ChallengeConfigRow | null
    error = fallback.error
  }

  if (error) {
    if (isMissingChallengesSchemaError(error)) {
      return NextResponse.json({
        config: DEFAULT_CHALLENGE_CONFIG,
        schemaReady: false,
        warning: "Falta crear la tabla desafio_config en Supabase.",
      })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const editionsResult = await supabase
    .from("desafio_ediciones")
    .select("slug, titulo, activo, juegos_activos, sopa_palabras, memoria_modo, puzzle_imagenes, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(80)
  let editionRows = editionsResult.data as ChallengeConfigRow[] | null
  let editionsError = editionsResult.error

  if (
    editionsError?.code === "42703" &&
    (editionsError.message?.includes("memoria_modo") ||
      editionsError.message?.includes("sopa_palabras") ||
      editionsError.message?.includes("puzzle_imagenes"))
  ) {
    const fallback = await supabase
      .from("desafio_ediciones")
      .select("slug, titulo, activo, juegos_activos, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(80)
    editionRows = fallback.data as ChallengeConfigRow[] | null
    editionsError = fallback.error
  }

  const editions =
    editionsError && isMissingChallengesSchemaError(editionsError)
      ? []
      : ((editionRows || []) as ChallengeConfigRow[])
          .map(editionFromRow)
          .filter(Boolean)

  if (editionsError && !isMissingChallengesSchemaError(editionsError)) {
    return NextResponse.json({ error: editionsError.message }, { status: 500 })
  }

  const currentConfig = configFromRow(data as ChallengeConfigRow | null)

  return NextResponse.json({
    config: currentConfig,
    editions:
      editions.length > 0
        ? editions
        : currentConfig.slug
          ? [
              {
                slug: currentConfig.slug,
                titulo: currentConfig.titulo || currentConfig.slug,
                activo: currentConfig.activo,
                juegosActivos: currentConfig.juegosActivos,
                sopaPalabras: currentConfig.sopaPalabras,
                memoriaModo: currentConfig.memoriaModo,
                puzzleImagenes: currentConfig.puzzleImagenes,
                createdAt: null,
                updatedAt: (data as ChallengeConfigRow | null)?.updated_at || null,
              },
            ]
          : [],
    schemaReady: true,
  })
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession(request)
  if (!session) {
    return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
  }

  const body = (await request.json()) as {
    action?: unknown
    activo?: unknown
    juegosActivos?: unknown
    sopaPalabras?: unknown
    memoriaModo?: unknown
    puzzleImagenes?: unknown
    slug?: unknown
    titulo?: unknown
  }
  const juegosActivos = normalizeChallengeKeys(body.juegosActivos)
  const sopaPalabras = normalizeWordSearchWords(body.sopaPalabras)
  const memoriaModo = normalizeMemoryMode(body.memoriaModo)
  const puzzleImagenes = normalizePuzzleImages(body.puzzleImagenes)
  const activo = body.activo === true
  const creatingChallenge = body.action === "create"
  const activatingChallenge = body.action === "activate"

  if (activo && juegosActivos.length === 0) {
    return NextResponse.json(
      { error: "Activa al menos un juego para publicar el desafio." },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()
  let nextSlug = creatingChallenge ? createChallengeSlug() : undefined
  let nextTitle = creatingChallenge
    ? normalizeTitle(body.titulo, `Desafio ${new Date().toLocaleDateString("es-UY")}`)
    : undefined
  let nextGames = juegosActivos
  let nextSoupWords = sopaPalabras
  let nextMemoryMode = memoriaModo
  let nextPuzzleImages = puzzleImagenes
  let nextActive = activo

  if (activatingChallenge) {
    const slugToActivate = typeof body.slug === "string" ? body.slug.trim() : ""
    if (!slugToActivate) {
      return NextResponse.json({ error: "Selecciona un desafio para activar." }, { status: 400 })
    }

    const { data: editionRow, error: editionError } = await supabase
      .from("desafio_ediciones")
      .select("slug, titulo, activo, juegos_activos, sopa_palabras, memoria_modo, puzzle_imagenes")
      .eq("slug", slugToActivate)
      .maybeSingle()

    if (editionError) {
      return NextResponse.json({ error: editionError.message }, { status: 500 })
    }

    if (!editionRow) {
      return NextResponse.json({ error: "No encontramos esa edicion de desafio." }, { status: 404 })
    }

    nextSlug = String(editionRow.slug)
    nextTitle = String(editionRow.titulo || editionRow.slug)
    nextGames = normalizeChallengeKeys(editionRow.juegos_activos)
    nextSoupWords = normalizeWordSearchWords(editionRow.sopa_palabras)
    nextMemoryMode = normalizeMemoryMode(editionRow.memoria_modo)
    nextPuzzleImages = normalizePuzzleImages(editionRow.puzzle_imagenes)
    nextActive = editionRow.activo !== false
  }

  if ((creatingChallenge || activatingChallenge) && nextActive && nextGames.length === 0) {
    return NextResponse.json(
      { error: "Activa al menos un juego para publicar el desafio." },
      { status: 400 }
    )
  }

  if (creatingChallenge && nextSlug) {
    const { error: editionInsertError } = await supabase.from("desafio_ediciones").insert([
      {
        slug: nextSlug,
        titulo: nextTitle,
        activo: nextActive,
        juegos_activos: nextGames,
        sopa_palabras: nextSoupWords,
        memoria_modo: nextMemoryMode,
        puzzle_imagenes: nextPuzzleImages,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])

    if (editionInsertError) {
      if (isMissingChallengesSchemaError(editionInsertError)) {
        return NextResponse.json(
          { error: "Falta crear la tabla desafio_ediciones en Supabase." },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: editionInsertError.message }, { status: 500 })
    }
  }

  const currentPayload = {
    id: 1,
    activo: nextActive,
    juegos_activos: nextGames,
    sopa_palabras: nextSoupWords,
    memoria_modo: nextMemoryMode,
    puzzle_imagenes: nextPuzzleImages,
    ...(nextSlug ? { slug: nextSlug } : {}),
    ...(nextTitle ? { titulo: nextTitle } : {}),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("desafio_config")
    .upsert(currentPayload, { onConflict: "id" })
    .select("activo, juegos_activos, sopa_palabras, memoria_modo, puzzle_imagenes, slug, titulo")
    .single()

  if (error) {
    if (isMissingChallengesSchemaError(error)) {
      return NextResponse.json(
        { error: "Falta crear la tabla desafio_config en Supabase." },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const savedConfig = configFromRow(data as ChallengeConfigRow)

  if (!creatingChallenge && !activatingChallenge && savedConfig.slug) {
    const { error: editionUpdateError } = await supabase
      .from("desafio_ediciones")
      .upsert(
        {
          slug: savedConfig.slug,
          titulo: savedConfig.titulo || savedConfig.slug,
          activo: savedConfig.activo,
          juegos_activos: savedConfig.juegosActivos,
          sopa_palabras: savedConfig.sopaPalabras,
          memoria_modo: savedConfig.memoriaModo,
          puzzle_imagenes: savedConfig.puzzleImagenes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" }
      )

    if (editionUpdateError && !isMissingChallengesSchemaError(editionUpdateError)) {
      return NextResponse.json({ error: editionUpdateError.message }, { status: 500 })
    }
  }

  const selectedLabels = CHALLENGE_GAME_OPTIONS.filter((game) =>
    nextGames.includes(game.key)
  )
    .map((game) => game.label)
    .join(", ")

  await logAdminActivityServer(session, {
    action: creatingChallenge
      ? "Crear desafio"
      : activatingChallenge
        ? "Activar edicion de desafio"
        : nextActive
          ? "Activar desafio"
          : "Pausar desafio",
    section: "Desafios",
    target: creatingChallenge || activatingChallenge ? nextTitle || nextSlug || "Desafio" : "Configuracion del desafio",
    details: `Juegos activos: ${selectedLabels || "ninguno"}.`,
  })

  revalidatePath("/juga-y-gana")
  if (nextSlug) {
    revalidatePath(`/juga-y-gana/${nextSlug}`)
  }

  return NextResponse.json({
    ok: true,
    config: savedConfig,
  })
}
