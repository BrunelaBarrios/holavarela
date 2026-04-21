import { NextResponse } from "next/server"
import { parseEventDescription } from "../../../lib/eventSubmissionMeta"
import { sendAdminNotification } from "../../../lib/emailNotifications"
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin"
import { consumeRateLimit, getClientIp } from "../../../lib/rateLimit"

type PublicEventPayload = {
  titulo?: string
  categoria?: string
  fecha?: string
  fecha_fin?: string | null
  fecha_solo_mes?: boolean
  ubicacion?: string
  telefono?: string | null
  web_url?: string | null
  instagram_url?: string | null
  facebook_url?: string | null
  descripcion?: string
  imagen?: string | null
  estado?: string
  usa_whatsapp?: boolean
}

export async function POST(request: Request) {
  try {
    const rateLimit = consumeRateLimit({
      key: `public-event-request:${getClientIp(request)}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiados envios seguidos. Intenta nuevamente en unos minutos." },
        { status: 429 }
      )
    }

    const body = (await request.json()) as PublicEventPayload
    const payload = {
      titulo: body.titulo?.trim() || "",
      categoria: body.categoria?.trim() || "Evento",
      fecha: body.fecha?.trim() || "",
      fecha_fin: body.fecha_fin?.trim() || null,
      fecha_solo_mes: Boolean(body.fecha_solo_mes),
      ubicacion: body.ubicacion?.trim() || "",
      telefono: body.telefono?.trim() || null,
      web_url: body.web_url?.trim() || null,
      instagram_url: body.instagram_url?.trim() || null,
      facebook_url: body.facebook_url?.trim() || null,
      descripcion: body.descripcion?.trim() || "",
      imagen: body.imagen || null,
      estado: "borrador",
      usa_whatsapp: body.usa_whatsapp ?? true,
      owner_email: null,
      institucion_id: null,
    }

    if (!payload.titulo || !payload.fecha || !payload.ubicacion || !payload.descripcion) {
      return NextResponse.json(
        { error: "Completa titulo, fecha, ubicacion y descripcion antes de enviar." },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { error: insertError } = await supabaseAdmin.from("eventos").insert([payload])

    if (insertError) {
      throw insertError
    }

    const parsedDescription = parseEventDescription(payload.descripcion)

    try {
      await sendAdminNotification({
        subject: "Hola Varela - Nueva solicitud de evento",
        intro: "Llego una nueva solicitud de evento para revisar y publicar.",
        fields: [
          { label: "Titulo", value: payload.titulo },
          { label: "Categoria", value: payload.categoria },
          { label: "Fecha desde", value: payload.fecha },
          { label: "Fecha hasta", value: payload.fecha_fin },
          { label: "Ubicacion", value: payload.ubicacion },
          { label: "Telefono publico", value: payload.telefono },
          { label: "WhatsApp", value: payload.usa_whatsapp ? "Si" : "No" },
          { label: "Contacto del remitente", value: parsedDescription.submissionContact?.senderName },
          { label: "Telefono del remitente", value: parsedDescription.submissionContact?.senderPhone },
          { label: "Descripcion", value: parsedDescription.baseDescription },
        ],
      })
    } catch (notificationError) {
      console.error(notificationError)
    }

    return NextResponse.json({
      ok: true,
      message: "Recibimos tu contenido y lo vamos a revisar.",
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No pudimos guardar el evento en este momento."

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
