import { revalidatePath } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"
import { logAdminActivityServer } from "../../../lib/adminActivityServer"
import { readAdminSessionFromRequest } from "../../../lib/adminSession"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"

const entityConfig = {
  comercio: { table: "comercios", label: "Comercios" },
  servicio: { table: "servicios", label: "Servicios" },
  institucion: { table: "instituciones", label: "Instituciones" },
} as const

type EntityType = keyof typeof entityConfig

type MovePayload = {
  sourceType?: EntityType
  sourceId?: number
  targetType?: EntityType
  serviceCategory?: string
}

function destinationPayload(
  source: Record<string, unknown>,
  targetType: EntityType,
  serviceCategory?: string
) {
  const common = {
    nombre: source.nombre,
    descripcion: source.descripcion ?? null,
    direccion: source.direccion ?? null,
    web_url: source.web_url ?? null,
    instagram_url: source.instagram_url ?? null,
    facebook_url: source.facebook_url ?? null,
    estado: source.estado ?? "activo",
    destacado: Boolean(source.destacado),
    usa_whatsapp: source.usa_whatsapp !== false,
    owner_email: source.owner_email ?? null,
    plan_suscripcion: source.plan_suscripcion ?? null,
    estado_suscripcion: source.estado_suscripcion ?? "pendiente",
    suscripcion_actualizada_at: source.suscripcion_actualizada_at ?? null,
    mp_preapproval_id: source.mp_preapproval_id ?? null,
    premium_detalle: source.premium_detalle ?? null,
    premium_galeria: source.premium_galeria ?? null,
    premium_extra_titulo: source.premium_extra_titulo ?? null,
    premium_extra_detalle: source.premium_extra_detalle ?? null,
    premium_extra_galeria: source.premium_extra_galeria ?? null,
    premium_activo: Boolean(source.premium_activo),
  }

  if (targetType === "comercio") {
    return {
      ...common,
      telefono: source.telefono ?? source.contacto ?? null,
      imagen_url: source.imagen_url ?? source.imagen ?? source.foto ?? null,
    }
  }

  if (targetType === "servicio") {
    return {
      ...common,
      categoria: serviceCategory?.trim() || "Servicios",
      responsable: source.responsable ?? null,
      contacto: source.contacto ?? source.telefono ?? null,
      imagen: source.imagen ?? source.imagen_url ?? source.foto ?? null,
    }
  }

  return {
    ...common,
    telefono: source.telefono ?? source.contacto ?? null,
    foto: source.foto ?? source.imagen_url ?? source.imagen ?? null,
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await readAdminSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: "Sesion admin requerida." }, { status: 401 })
    }

    const body = (await request.json()) as MovePayload
    const sourceType = body.sourceType
    const targetType = body.targetType

    if (!sourceType || !targetType || !entityConfig[sourceType] || !entityConfig[targetType]) {
      return NextResponse.json({ error: "La categoria elegida no es valida." }, { status: 400 })
    }
    if (!body.sourceId || sourceType === targetType) {
      return NextResponse.json({ error: "Elegi una categoria de destino diferente." }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const sourceConfig = entityConfig[sourceType]
    const targetConfig = entityConfig[targetType]
    const { data: source, error: sourceError } = await supabaseAdmin
      .from(sourceConfig.table)
      .select("*")
      .eq("id", body.sourceId)
      .maybeSingle()

    if (sourceError) throw sourceError
    if (!source) {
      return NextResponse.json({ error: "No encontramos la publicacion a mover." }, { status: 404 })
    }

    const { data: created, error: insertError } = await supabaseAdmin
      .from(targetConfig.table)
      .insert([destinationPayload(source, targetType, body.serviceCategory)])
      .select("*")
      .single()

    if (insertError) throw insertError

    const { error: deleteError } = await supabaseAdmin
      .from(sourceConfig.table)
      .delete()
      .eq("id", body.sourceId)

    if (deleteError) {
      await supabaseAdmin.from(targetConfig.table).delete().eq("id", created.id)
      throw deleteError
    }

    await supabaseAdmin
      .from("destacados_home")
      .update({ entidad_tipo: targetType, entidad_id: created.id })
      .eq("entidad_tipo", sourceType)
      .eq("entidad_id", body.sourceId)

    await logAdminActivityServer(session, {
      action: `Mover a ${targetConfig.label}`,
      section: sourceConfig.label,
      target: String(source.nombre || "Publicacion"),
    })

    for (const path of ["/", "/comercios", "/servicios", "/instituciones"]) {
      revalidatePath(path)
    }

    return NextResponse.json({ ok: true, record: created, targetType })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos mover la publicacion."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
