import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { logAdminActivityServer } from "../../../lib/adminActivityServer"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type SaveSitePayload = {
  action: "save"
  payload: {
    titulo?: string
    texto_1?: string
    texto_2?: string
    texto_3?: string
    imagen_url?: string | null
    mostrar_juegos_home?: boolean
    mostrar_ranking_juego_home?: boolean
    burbuja_home_activa?: boolean
    burbuja_home_titulo?: string | null
    burbuja_home_texto?: string | null
    burbuja_home_visible_desde?: string | null
    burbuja_home_visible_hasta?: string | null
  }
}

function normalizeText(value?: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export async function POST(request: NextRequest) {
  try {
    const session = await readAdminSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const body = (await request.json()) as SaveSitePayload
    if (body.action !== "save") {
      return NextResponse.json({ error: "Accion no valida." }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const sitePayload = {
      id: 1,
      titulo: body.payload.titulo,
      texto_1: body.payload.texto_1,
      texto_2: body.payload.texto_2,
      texto_3: body.payload.texto_3,
      imagen_url: body.payload.imagen_url || null,
      mostrar_juegos_home: body.payload.mostrar_juegos_home !== false,
      mostrar_ranking_juego_home: body.payload.mostrar_ranking_juego_home === true,
      burbuja_home_activa: body.payload.burbuja_home_activa === true,
      burbuja_home_titulo: normalizeText(body.payload.burbuja_home_titulo),
      burbuja_home_texto: normalizeText(body.payload.burbuja_home_texto),
      burbuja_home_visible_desde: body.payload.burbuja_home_visible_desde || null,
      burbuja_home_visible_hasta: body.payload.burbuja_home_visible_hasta || null,
    }

    let savedHomeGamesVisibility = true
    let savedHomeBubbleSettings = true
    let { error } = await supabaseAdmin.from("sitio").upsert(sitePayload)

    if (error?.code === "42703") {
      const visibilityOnlyPayload = {
        id: sitePayload.id,
        titulo: sitePayload.titulo,
        texto_1: sitePayload.texto_1,
        texto_2: sitePayload.texto_2,
        texto_3: sitePayload.texto_3,
        imagen_url: sitePayload.imagen_url,
        mostrar_juegos_home: sitePayload.mostrar_juegos_home,
        mostrar_ranking_juego_home: sitePayload.mostrar_ranking_juego_home,
      }

      const visibilityResult = await supabaseAdmin.from("sitio").upsert(visibilityOnlyPayload)
      error = visibilityResult.error
      savedHomeBubbleSettings = false
    }

    if (error?.code === "42703") {
      const legacyPayload = {
        id: sitePayload.id,
        titulo: sitePayload.titulo,
        texto_1: sitePayload.texto_1,
        texto_2: sitePayload.texto_2,
        texto_3: sitePayload.texto_3,
        imagen_url: sitePayload.imagen_url,
      }

      const legacyResult = await supabaseAdmin.from("sitio").upsert(legacyPayload)
      error = legacyResult.error
      savedHomeGamesVisibility = false
      savedHomeBubbleSettings = false
    }

    if (error) throw error

    await logAdminActivityServer(session, {
      action: "Editar",
      section: "Sitio",
      target: "Contenido principal",
      details: "Actualizo textos, imagen o bloques visibles de la home.",
    })

    revalidatePath("/")

    return NextResponse.json({ ok: true, savedHomeGamesVisibility, savedHomeBubbleSettings })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar la configuracion."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
