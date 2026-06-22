import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { logAdminActivityServer } from "../../../lib/adminActivityServer"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import {
  DEFAULT_GOAL_GAME_CONFIG,
  isMissingGoalGameSchemaError,
  normalizeGoalGameBanner,
  normalizeGoalGameTitle,
} from "../../../lib/goalGame"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type GoalGameConfigRow = {
  activo?: boolean | null
  titulo?: string | null
  texto_banner?: string | null
  mostrar_ranking_home?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

function configFromRow(row: GoalGameConfigRow | null | undefined) {
  return {
    activo: row?.activo === true,
    titulo: normalizeGoalGameTitle(row?.titulo),
    textoBanner: normalizeGoalGameBanner(row?.texto_banner),
    mostrarRankingHome: row?.mostrar_ranking_home === true,
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  }
}

async function requireAdminSession(request: NextRequest) {
  return readAdminSessionFromRequest(request)
}

async function loadRanking(limit = 100) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from("juego_gol_participaciones")
    .select("id, nombre, puntaje, created_at")
    .order("puntaje", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error) throw error

  return (data || []).map((entry) => ({
    id: Number(entry.id),
    nombre: entry.nombre || "Participante",
    puntaje: Number(entry.puntaje || 0),
    createdAt: entry.created_at || null,
  }))
}

export async function GET(request: NextRequest) {
  const session = await requireAdminSession(request)
  if (!session) {
    return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()

  try {
    const { data, error } = await supabase
      .from("juego_gol_config")
      .select("activo, titulo, texto_banner, mostrar_ranking_home, created_at, updated_at")
      .eq("id", 1)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      config: configFromRow(data as GoalGameConfigRow | null),
      ranking: await loadRanking(),
      schemaReady: true,
    })
  } catch (error) {
    if (isMissingGoalGameSchemaError(error as { code?: string; message?: string })) {
      return NextResponse.json({
        config: DEFAULT_GOAL_GAME_CONFIG,
        ranking: [],
        schemaReady: false,
        warning: "Falta crear las tablas juego_gol_config y juego_gol_participaciones en Supabase.",
      })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el juego." },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession(request)
  if (!session) {
    return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    activo?: unknown
    titulo?: unknown
    textoBanner?: unknown
    mostrarRankingHome?: unknown
  }
  const payload = {
    id: 1,
    activo: body.activo === true,
    titulo: normalizeGoalGameTitle(body.titulo),
    texto_banner: normalizeGoalGameBanner(body.textoBanner),
    mostrar_ranking_home: body.mostrarRankingHome === true,
    updated_at: new Date().toISOString(),
  }
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from("juego_gol_config")
    .upsert(payload, { onConflict: "id" })
    .select("activo, titulo, texto_banner, mostrar_ranking_home, created_at, updated_at")
    .single()

  if (error) {
    if (isMissingGoalGameSchemaError(error)) {
      return NextResponse.json(
        { error: "Falta crear la tabla juego_gol_config en Supabase." },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAdminActivityServer(session, {
    action: payload.activo ? "Activar Desafio del Gol" : "Pausar Desafio del Gol",
    section: "Desafio del Gol",
    target: payload.titulo,
    details: `Banner: ${payload.texto_banner}. Ranking en home: ${payload.mostrar_ranking_home ? "si" : "no"}.`,
  })

  revalidatePath("/")
  revalidatePath("/juego-gol")

  return NextResponse.json({
    ok: true,
    config: configFromRow(data as GoalGameConfigRow),
  })
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdminSession(request)
  if (!session) {
    return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
  }

  const id = Number(new URL(request.url).searchParams.get("id"))
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Participante invalido." }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: entry } = await supabase
    .from("juego_gol_participaciones")
    .select("nombre")
    .eq("id", id)
    .maybeSingle()
  const { error } = await supabase
    .from("juego_gol_participaciones")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await logAdminActivityServer(session, {
    action: "Eliminar participante",
    section: "Desafio del Gol",
    target: entry?.nombre || `Participante ${id}`,
    details: "Elimino un participante del ranking del Desafio del Gol.",
  })

  revalidatePath("/")
  revalidatePath("/juego-gol")

  return NextResponse.json({
    ok: true,
    ranking: await loadRanking(),
  })
}
