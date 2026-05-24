import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { logAdminActivityServer } from "../../../../lib/adminActivityServer"
import { readAdminSessionFromRequest } from "../../../../lib/adminSession"
import {
  CHALLENGE_GAME_OPTIONS,
  DEFAULT_CHALLENGE_CONFIG,
  isMissingChallengesSchemaError,
  normalizeChallengeKeys,
} from "../../../../lib/challengeGame"
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin"

type ChallengeConfigRow = {
  activo?: boolean | null
  juegos_activos?: unknown
}

function configFromRow(row: ChallengeConfigRow | null | undefined) {
  if (!row) return DEFAULT_CHALLENGE_CONFIG

  return {
    activo: row.activo !== false,
    juegosActivos: normalizeChallengeKeys(row.juegos_activos),
  }
}

async function requireAdminSession(request: NextRequest) {
  return readAdminSessionFromRequest(request)
}

export async function GET(request: NextRequest) {
  const session = await requireAdminSession(request)
  if (!session) {
    return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
  }

  const { data, error } = await getSupabaseAdmin()
    .from("desafio_config")
    .select("activo, juegos_activos")
    .eq("id", 1)
    .maybeSingle()

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

  return NextResponse.json({
    config: configFromRow(data as ChallengeConfigRow | null),
    schemaReady: true,
  })
}

export async function POST(request: NextRequest) {
  const session = await requireAdminSession(request)
  if (!session) {
    return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
  }

  const body = (await request.json()) as {
    activo?: unknown
    juegosActivos?: unknown
  }
  const juegosActivos = normalizeChallengeKeys(body.juegosActivos)
  const activo = body.activo === true

  if (activo && juegosActivos.length === 0) {
    return NextResponse.json(
      { error: "Activa al menos un juego para publicar el desafio." },
      { status: 400 }
    )
  }

  const { data, error } = await getSupabaseAdmin()
    .from("desafio_config")
    .upsert(
      {
        id: 1,
        activo,
        juegos_activos: juegosActivos,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("activo, juegos_activos")
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

  const selectedLabels = CHALLENGE_GAME_OPTIONS.filter((game) =>
    juegosActivos.includes(game.key)
  )
    .map((game) => game.label)
    .join(", ")

  await logAdminActivityServer(session, {
    action: activo ? "Activar desafio" : "Pausar desafio",
    section: "Desafios",
    target: "Configuracion del desafio",
    details: `Juegos activos: ${selectedLabels || "ninguno"}.`,
  })

  revalidatePath("/juga-y-gana")

  return NextResponse.json({
    ok: true,
    config: configFromRow(data as ChallengeConfigRow),
  })
}
