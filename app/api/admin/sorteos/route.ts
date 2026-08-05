import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { logAdminActivityServer } from "../../../lib/adminActivityServer"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

type ToggleSweepstakesPayload = {
  action: "set_active"
  id: number
  activo: boolean
}

type SaveSweepstakesPayload = {
  id?: number | null
  payload: Record<string, unknown> & { titulo?: string; activo?: boolean }
}

export async function POST(request: NextRequest) {
  try {
    const session = await readAdminSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const body = (await request.json()) as SaveSweepstakesPayload
    const id = body.id ? Number(body.id) : null
    const payload = body.payload
    if (!payload?.titulo?.trim() || (id !== null && !Number.isFinite(id))) {
      return NextResponse.json({ error: "Datos del sorteo no validos." }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    if (payload.activo) {
      const query = supabaseAdmin.from("sorteo_popup_config").update({ activo: false })
      const { error } = id ? await query.neq("id", id) : await query.neq("id", -1)
      if (error) throw error
    }

    const result = id
      ? await supabaseAdmin.from("sorteo_popup_config").update(payload).eq("id", id).select("id").single()
      : await supabaseAdmin.from("sorteo_popup_config").insert(payload).select("id").single()
    if (result.error) throw result.error

    const savedId = Number(result.data.id)
    await logAdminActivityServer(session, {
      action: id ? "Editar" : "Crear",
      section: "Sorteos",
      target: payload.titulo,
      details: id ? "Actualizo una campana de sorteo." : "Creo una nueva campana de sorteo.",
    })

    revalidatePath("/")
    revalidatePath("/sorteo")
    revalidatePath(`/sorteo/${savedId}`)
    return NextResponse.json({ ok: true, id: savedId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el sorteo."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await readAdminSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const body = (await request.json()) as ToggleSweepstakesPayload
    const id = Number(body.id)
    if (body.action !== "set_active" || !Number.isFinite(id)) {
      return NextResponse.json({ error: "Solicitud no valida." }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: campaign, error: findError } = await supabaseAdmin
      .from("sorteo_popup_config")
      .select("id, titulo")
      .eq("id", id)
      .maybeSingle()

    if (findError) throw findError
    if (!campaign) {
      return NextResponse.json({ error: "No encontramos el sorteo." }, { status: 404 })
    }

    const { error: deactivateError } = await supabaseAdmin
      .from("sorteo_popup_config")
      .update({ activo: false })
      .neq("id", -1)

    if (deactivateError) throw deactivateError

    if (body.activo) {
      const { error: activateError } = await supabaseAdmin
        .from("sorteo_popup_config")
        .update({ activo: true, updated_at: new Date().toISOString() })
        .eq("id", id)

      if (activateError) throw activateError
    }

    await logAdminActivityServer(session, {
      action: body.activo ? "Activar" : "Desactivar",
      section: "Sorteos",
      target: campaign.titulo || `Sorteo #${id}`,
      details: body.activo ? "Activo el sorteo." : "Desactivo el sorteo.",
    })

    revalidatePath("/")
    revalidatePath("/sorteo")
    revalidatePath(`/sorteo/${id}`)

    return NextResponse.json({ ok: true, id, activo: body.activo })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cambiar el estado."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
