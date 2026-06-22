import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import {
  isMissingGoalGameSchemaError,
  normalizeGoalPlayerName,
} from "../../../lib/goalGame"
import { getSupabaseServer } from "../../../lib/supabaseServer"

function normalizeScore(value: unknown) {
  const score = Number(value)
  if (!Number.isFinite(score)) return 0

  return Math.max(0, Math.min(999, Math.trunc(score)))
}

async function loadRanking() {
  const supabase = getSupabaseServer()
  const { data, error } = await supabase
    .from("juego_gol_participaciones")
    .select("id, nombre, puntaje, created_at")
    .order("puntaje", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(20)

  if (error) throw error

  return (data || []).map((entry) => ({
    id: Number(entry.id),
    nombre: entry.nombre || "Participante",
    puntaje: Number(entry.puntaje || 0),
    createdAt: entry.created_at || null,
  }))
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    nombre?: unknown
    puntaje?: unknown
  }
  const nombre = normalizeGoalPlayerName(body.nombre)
  const puntaje = normalizeScore(body.puntaje)

  if (!nombre) {
    return NextResponse.json({ error: "Ingresa un nombre para guardar tu puntaje." }, { status: 400 })
  }

  const supabase = getSupabaseServer()

  try {
    const { data: config, error: configError } = await supabase
      .from("juego_gol_config")
      .select("activo")
      .eq("id", 1)
      .maybeSingle()

    if (configError) throw configError

    if (config?.activo !== true) {
      return NextResponse.json({ error: "El Desafio del Gol no esta activo." }, { status: 403 })
    }

    const { error: insertError } = await supabase
      .from("juego_gol_participaciones")
      .insert([{ nombre, puntaje }])

    if (insertError) throw insertError

    revalidatePath("/")
    revalidatePath("/juego-gol")

    return NextResponse.json({
      ok: true,
      ranking: await loadRanking(),
    })
  } catch (error) {
    if (isMissingGoalGameSchemaError(error as { code?: string; message?: string })) {
      return NextResponse.json(
        { error: "Falta crear las tablas del Desafio del Gol en Supabase." },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar el puntaje." },
      { status: 500 }
    )
  }
}
